const mongoose = require('mongoose');

mongoose.connect('mongodb://admin:root@localhost:27017/tpGPT?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected via Docker"))
  .catch(err => console.error("MongoDB connection error:", err));
