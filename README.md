<h1>BoozeUP</h1>

<p>
BoozeUP is a social drink tracking app built with Android (Jetpack Compose) and Firebase.
Create or join drinking groups, track alcohol consumption, and compare your progress in real time.
</p>

<hr>

<h2>Key Features by Screen</h2>

<h3>Registration & Login</h3>
<ul>
  <li>Firebase Authentication (email & password)</li>
  <li>Profile creation with unique username</li>
  <li>"Remember Me" checkbox</li>
  <li>Registration validation with existing usernames</li>
</ul>

<h3>Home View</h3>
<ul>
  <li>Shows current group name and role (admin/member)</li>
  <li>Create or join a group</li>
  <li>Leads to BeerCounterScreen if group is active</li>
</ul>

<h3>Beer Counter</h3>
<ul>
  <li>Realtime leaderboard of group members</li>
  <li>Add or remove drinks with volume and alcohol %</li>
  <li>Points auto-calculated based on alcohol content</li>
  <li>Displays points, litres, and total drink count</li>
</ul>

<h3>Social View</h3>
<ul>
  <li>Search users by username</li>
  <li>Send and accept friend requests</li>
  <li>Handle group invitations</li>
  <li>Edit and remove friends</li>
</ul>

<h3>Create Group</h3>
<ul>
  <li>Create new group and become admin</li>
  <li>Select friends to invite</li>
</ul>

<h3>Group Management</h3>
<ul>
  <li>Admins can remove members</li>
  <li>Send group invitations to friends</li>
  <li>End game and save to history</li>
</ul>

<h3>Profile & Statistics</h3>
<ul>
  <li>Upload or change profile picture</li>
  <li>View aggregated statistics</li>
  <li>Access game history (last 3 games)</li>
</ul>

<h3>Settings</h3>
<ul>
  <li>Language selection (coming)</li>
  <li>Blood alcohol calculator (coming)</li>
</ul>

<hr>

<h2>Point System</h2>
<p>
1 point = 1.485 cl of pure alcohol
</p>
<pre>
<code>
points = (volumeCl * (alcoholPercentage / 100)) / 1.485
</code>
</pre>

<hr>

<h2>Localization</h2>
<p>Supports English (default) and Finnish. Language switching via Settings (in development).</p>

<h2>Theme</h2>
<p>Light and dark themes via Material Theme Builder.</p>

<h2>Tech Stack</h2>
<ul>
  <li>Kotlin with Jetpack Compose</li>
  <li>Firebase Auth, Realtime DB, and Storage</li>
  <li>MVVM Architecture</li>
  <li>Coil for image loading</li>
</ul>

<hr>

<h2>Screenshots</h2>
<p>Place your images in the <code>screenshots/</code> directory. Example layout:</p>

<div align="center">
  <img src="screenshots/RegistrationScreen.png" width="220"/>
  <img src="screenshots/LoginScreen.png" width="220"/>
  <img src="screenshots/HomeScreen_nogroup.png" width="220"/>
  <img src="screenshots/GameScreen_alone.png" width="220"/>
  <img src="screenshots/GameScreen_full.png" width="220"/>
  <img src="screenshots/GroupEditScreen.png" width="220"/>
  <img src="screenshots/SocialScreen_nofriends.png" width="220"/>
  <img src="screenshots/SocialScreen_friends.png" width="220"/>
  <img src="screenshots/ProfileScreen.png" width="220"/>
  <img src="screenshots/SettingsScreen.png" width="220"/>
</div>

<hr>

<h2>Project Summary</h2>

<p>
BoozeUP was created as a technically versatile mobile app project during software engineering studies.
The aim was to develop a real-time, group-based alcohol tracking system with social features, statistics,
and visual history.
</p>

<p>
Firebase services (Authentication, Realtime Database, Storage) enable robust back-end support, while
Jetpack Compose provides a responsive and modern UI layer.
</p>

<p>
The project follows MVVM architecture and showcases best practices in state handling, cloud integration,
and UI design for mobile.
</p>
