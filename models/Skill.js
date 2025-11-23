
const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  id: String,
  date: String,
  topic: String,
  subject: String,
  module: String,
  progress: String,
  videoUrl: String,
  websiteUrl: String,
  otherUrl: String,
  docsUrl: String
});

const SkillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  id: String, // Frontend ID
  name: String,
  description: String,
  entries: [EntrySchema],
  createdAt: String,
  themeColor: String
});

module.exports = mongoose.model('Skill', SkillSchema);
