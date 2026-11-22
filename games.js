// ======================================================
//  THE GAME LIST - the home page shows one big button per game.
//
//  To ADD a game:    make a folder in games/ with an index.html,
//                    then add a line below.
//  To HIDE a game:   put // in front of its line (keeps the files).
//  To REMOVE a game: delete its line and its folder in games/.
//
//  folder: the folder name inside games/
//  title:  the name shown under the button
//  icon:   a picture file inside that folder (optional)
//  emoji:  shown when there is no icon picture
//  color:  the button's background color
// ======================================================
var GAMES = [
  { folder: "whackamole", title: "Whack-a-Mole", icon: "icon.png", emoji: "🐹", color: "#7ec850" },
  { folder: "horserace",  title: "Horse Race",   emoji: "🏇", color: "#f4a640" },
];
