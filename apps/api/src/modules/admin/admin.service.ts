import { User } from "../../models/index.js";

export async function listPendingUsers() {
  return User.findAll({
    where: { approvalStatus: "pending" },
    attributes: [
      "id",
      "firstName",
      "lastName",
      "email",
      "role",
      "personnelType",
      "createdAt",
    ],
    order: [["createdAt", "ASC"]],
  });
}

export async function approveUser(targetId: number, adminId: number) {
  const user = await User.findByPk(targetId);
  if (!user) return null;
  await user.update({
    approvalStatus: "approved",
    approvedBy: adminId,
    approvedAt: new Date(),
  });
  return user;
}

export async function rejectUser(targetId: number, adminId: number) {
  const user = await User.findByPk(targetId);
  if (!user) return null;
  await user.update({
    approvalStatus: "rejected",
    approvedBy: adminId,
    approvedAt: new Date(),
  });
  return user;
}
