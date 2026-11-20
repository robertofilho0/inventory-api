const mongoose = require('mongoose');
const toJSON = require('./toJSON');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, toJSON },
);

module.exports = mongoose.model('Category', categorySchema);
