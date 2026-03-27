const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteAuthUserOnFirestoreDelete = functions.firestore
    .document("users/{uid}")
    .onDelete(async (snap, context) => {
        const uid = context.params.uid;
        try {
            await admin.auth().deleteUser(uid);
            console.log(`Đã xóa thành công tài khoản Auth của user: ${uid}`);
        } catch (error) {
            console.error(`Lỗi khi xóa tài khoản Auth của user: ${uid}`, error);
        }
    });
