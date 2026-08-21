import { initializeApp } from "firebase/app";
import {
    connectAuthEmulator,
    deleteUser,
    getAuth,
    onAuthStateChanged,
    signInAnonymously
} from "firebase/auth";
import {
    connectDatabaseEmulator,
    get,
    getDatabase,
    increment,
    limitToLast,
    onValue,
    orderByChild,
    push,
    query,
    ref,
    runTransaction,
    update
} from "firebase/database";
import {
    connectStorageEmulator,
    getDownloadURL,
    getStorage,
    ref as storageRef,
    uploadBytes
} from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyD2wAQaGzwNU19hEhOCWq6Vrqq9hAdDq_o",
    authDomain: "boozeup-5277e.firebaseapp.com",
    databaseURL: "https://boozeup-5277e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "boozeup-5277e",
    storageBucket: "boozeup-5277e.firebasestorage.app",
    appId: "1:1041206831330:web:c77b62808668f01562d6bb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const listeners = new Map();
let nextListener = 1;

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectDatabaseEmulator(database, "127.0.0.1", 9100);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
}

function requireUser() {
    if (!auth.currentUser) {
        throw new Error("Authentication is required.");
    }
    return auth.currentUser;
}

function userData(uid, value) {
    if (!value) {
        return { uid, username: "", profilePicture: null, groupId: null };
    }
    return {
        uid,
        username: value.username || "",
        profilePicture: value.profilePicture || null,
        groupId: value.groupId || null
    };
}

function groupData(groupId, value) {
    const members = Object.entries(value?.members || {}).map(([uid, member]) => ({
        uid,
        username: member.username || "User",
        profilePicture: member.profilePicture || null,
        points: Number(member.points || 0),
        volumeCl: Number(member.volumeCl || 0),
        drinkCount: Number(member.drinkCount || 0),
        accepted: member.accepted !== false
    }));
    return {
        groupId,
        groupName: value?.name || "Game",
        phase: value?.state?.phase === "FINALIZING" ? "FINALIZING" : "ACTIVE",
        members
    };
}

async function restoreSession() {
    const current = await new Promise(resolve => {
        const stop = onAuthStateChanged(auth, user => {
            stop();
            resolve(user);
        });
    });
    if (!current) {
        return null;
    }
    const snapshot = await get(ref(database, `users/${current.uid}`));
    return userData(current.uid, snapshot.val());
}

async function registerUsername(payload) {
    const username = String(payload.username || "").trim().slice(0, 16);
    const key = String(payload.key || "");
    if (!username || !key) {
        throw new Error("Enter a username.");
    }
    const existingUser = auth.currentUser;
    const credential = existingUser ? { user: existingUser } : await signInAnonymously(auth);
    const createdNow = existingUser === null;
    const uid = credential.user.uid;
    const usernameRef = ref(database, `usernames/${key}`);
    try {
        const reservation = await runTransaction(usernameRef, current => {
            if (current === null || current.uid === uid) {
                return { uid, username };
            }
            return;
        }, { applyLocally: false });
        if (!reservation.committed) {
            throw new Error("That username is already taken.");
        }
        await update(ref(database), { [`users/${uid}`]: { username } });
        return userData(uid, { username });
    } catch (error) {
        try {
            const reserved = await get(usernameRef);
            if (reserved.val()?.uid === uid) {
                await update(ref(database), { [`usernames/${key}`]: null });
            }
        } catch (_) {
        }
        if (createdNow) {
            try {
                await deleteUser(credential.user);
            } catch (_) {
            }
        }
        throw error;
    }
}

async function joinGroup(payload) {
    const user = requireUser();
    const code = String(payload.code || "").replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
        throw new Error("Enter a six-digit game code.");
    }
    const codeSnapshot = await get(ref(database, `joinCodes/${code}`));
    const joinCode = codeSnapshot.val();
    if (!joinCode || joinCode.active !== true || Number(joinCode.expiresAt || 0) <= Date.now()) {
        throw new Error("The game code is invalid or expired.");
    }
    const profile = await get(ref(database, `users/${user.uid}`));
    const current = profile.val() || {};
    if (current.groupId) {
        throw new Error("You are already in a game.");
    }
    const member = {
        username: current.username || "User",
        points: 0,
        volumeCl: 0,
        drinkCount: 0,
        accepted: true
    };
    if (current.profilePicture) {
        member.profilePicture = current.profilePicture;
    }
    await update(ref(database), {
        [`groups/${joinCode.groupId}/members/${user.uid}`]: member,
        [`users/${user.uid}/groupId`]: joinCode.groupId
    });
    return { groupId: joinCode.groupId };
}

function chooseImage() {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) {
                reject(new Error("No image selected."));
                return;
            }
            if (!file.type.startsWith("image/")) {
                reject(new Error("Choose an image file."));
                return;
            }
            if (file.size >= 10 * 1024 * 1024) {
                reject(new Error("The image must be smaller than 10 MB."));
                return;
            }
            resolve(file);
        };
        input.oncancel = () => reject(new Error("No image selected."));
        input.click();
    });
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("The image could not be processed."));
                }
            }, "image/jpeg", 0.85);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("The image could not be opened."));
        };
        image.src = objectUrl;
    });
}

async function uploadProfilePicture() {
    const user = requireUser();
    const profileSnapshot = await get(ref(database, `users/${user.uid}`));
    const groupId = profileSnapshot.val()?.groupId || null;
    const file = await chooseImage();
    const jpeg = await compressImage(file);
    const target = storageRef(storage, `profile_pictures/${user.uid}/profile.jpg`);
    await uploadBytes(target, jpeg, { contentType: "image/jpeg" });
    const url = await getDownloadURL(target);
    const updates = { [`users/${user.uid}/profilePicture`]: url };
    if (groupId) {
        updates[`groups/${groupId}/members/${user.uid}/profilePicture`] = url;
    }
    await update(ref(database), updates);
    return { url };
}

async function assertActive(groupId) {
    const phase = await get(ref(database, `groups/${groupId}/state/phase`));
    if (phase.val() !== "ACTIVE") {
        throw new Error("The game is being finalized.");
    }
}

function pointsFor(volumeCl, alcohol) {
    return Math.round((volumeCl * (alcohol / 100) / (33 * 0.045)) * 100) / 100;
}

async function addDrink(payload) {
    const user = requireUser();
    const groupId = String(payload.groupId || "");
    const volumeCl = Number(payload.volumeCl);
    const alcohol = Number(payload.alcoholPercentage);
    if (!(volumeCl >= 1 && volumeCl <= 500 && alcohol >= 0 && alcohol <= 100)) {
        throw new Error("Check the drink values.");
    }
    await assertActive(groupId);
    const entryRef = push(ref(database, `groups/${groupId}/drinkEntries/${user.uid}`));
    await update(ref(database), {
        [`groups/${groupId}/drinkEntries/${user.uid}/${entryRef.key}`]: {
            timestamp: Date.now(),
            volume: volumeCl,
            alcohol
        },
        [`groups/${groupId}/members/${user.uid}/points`]: increment(pointsFor(volumeCl, alcohol)),
        [`groups/${groupId}/members/${user.uid}/volumeCl`]: increment(volumeCl),
        [`groups/${groupId}/members/${user.uid}/drinkCount`]: increment(1)
    });
    return { added: true };
}

async function removeLatest(payload) {
    const user = requireUser();
    const groupId = String(payload.groupId || "");
    await assertActive(groupId);
    const latestQuery = query(
        ref(database, `groups/${groupId}/drinkEntries/${user.uid}`),
        orderByChild("timestamp"),
        limitToLast(1)
    );
    const snapshot = await get(latestQuery);
    let latest = null;
    snapshot.forEach(child => {
        latest = { id: child.key, ...child.val() };
    });
    if (!latest) {
        return { removed: false };
    }
    const volumeCl = Number(latest.volume || 0);
    const alcohol = Number(latest.alcohol || 0);
    await update(ref(database), {
        [`groups/${groupId}/drinkEntries/${user.uid}/${latest.id}`]: null,
        [`groups/${groupId}/members/${user.uid}/points`]: increment(-pointsFor(volumeCl, alcohol)),
        [`groups/${groupId}/members/${user.uid}/volumeCl`]: increment(-volumeCl),
        [`groups/${groupId}/members/${user.uid}/drinkCount`]: increment(-1)
    });
    return { removed: true };
}

async function clearGroupId() {
    const user = requireUser();
    await update(ref(database), { [`users/${user.uid}/groupId`]: null });
    return { cleared: true };
}

const operations = {
    restoreSession,
    registerUsername,
    joinGroup,
    uploadProfilePicture,
    addDrink,
    removeLatest,
    clearGroupId
};

export function bridgeCall(operation, payload, onSuccess, onFailure) {
    Promise.resolve()
        .then(() => {
            const handler = operations[operation];
            if (!handler) {
                throw new Error(`Unknown operation: ${operation}`);
            }
            return handler(JSON.parse(payload || "{}"));
        })
        .then(result => onSuccess(JSON.stringify(result)))
        .catch(error => onFailure(error?.message || "Something went wrong."));
}

export function bridgeSubscribe(operation, payload, onEvent, onFailure) {
    const request = JSON.parse(payload || "{}");
    const user = requireUser();
    let stop;
    if (operation === "user") {
        stop = onValue(
            ref(database, `users/${user.uid}`),
            snapshot => onEvent(JSON.stringify(userData(user.uid, snapshot.val()))),
            error => onFailure(error?.message || "User data is unavailable.")
        );
    } else if (operation === "game") {
        const groupId = String(request.groupId || "");
        stop = onValue(
            ref(database, `groups/${groupId}`),
            snapshot => {
                if (!snapshot.exists()) {
                    onFailure("The game is unavailable.");
                    return;
                }
                onEvent(JSON.stringify(groupData(groupId, snapshot.val())));
            },
            error => onFailure(error?.message || "The game is unavailable.")
        );
    } else {
        throw new Error(`Unknown subscription: ${operation}`);
    }
    const token = nextListener++;
    listeners.set(token, stop);
    return token;
}

export function bridgeUnsubscribe(token) {
    const stop = listeners.get(token);
    if (stop) {
        stop();
        listeners.delete(token);
    }
}

export function bridgePrefersDarkMode() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
