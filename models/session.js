const mongoose = require('mongoose');
const {Schema} = mongoose;

const sessionSchema = new Schema(
    {
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      accessToken: {
        type: String,
        required: true,
      },
      refreshToken: {
        type: String,
        required: true,
      },
      expiration: {
        type: Date,
        required: true,
      },
    },
    { timestamps: true, versionKey: false }
);

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;