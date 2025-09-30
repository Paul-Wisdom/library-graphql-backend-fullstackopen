const { default: mongoose } = require("mongoose");
const uniqueValidator = require('mongoose-unique-validator')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 5
    },

    favoriteGenre: {
        type: String
    }
})

userSchema.plugin(uniqueValidator)
const User = mongoose.model('User', userSchema)
module.exports = User