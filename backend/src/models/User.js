import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    usuario: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    rol: { type: String, enum: ["admin", "vendedor"], default: "vendedor" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.compararPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("User", userSchema);
export default User;
