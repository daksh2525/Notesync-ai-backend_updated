
module.exports = [
  {
    key: "first_note",
    name: "First Note",
    description: "Created your first note",
    condition: (user, ctx) => ctx.noteCount >= 1,
  },
  {
    key: "week_warrior",
    name: "Week Warrior",
    description: "Maintained a 7-day streak",
    condition: (user) => user.currentStreak >= 7,
  },
  {
    key: "consistency_king",
    name: "Consistency King",
    description: "Reached a 30-day best streak",
    condition: (user) => user.longestStreak >= 30,
  },
  {
    key: "rising_star",
    name: "Rising Star",
    description: "Earned 100 XP",
    condition: (user) => user.xp >= 100,
  },
];