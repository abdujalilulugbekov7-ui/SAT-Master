const mongoose = require('mongoose');

async function connectDB(uri) {
  try {
    await mongoose.connect(uri, { autoIndex: true });
    console.log('MongoDB ulandi');
  } catch (e) {
    console.error('MongoDB xato:', e.message);
    process.exit(1);
  }
}

module.exports = connectDB;
