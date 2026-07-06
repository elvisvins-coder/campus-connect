import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db  = admin.firestore();
const fcm = admin.messaging();

export const sendPushNotification = functions.firestore
  .document("notifications/{uid}/items/{docId}")
  .onCreate(async (snap, context) => {
    const { uid } = context.params;
    const notif   = snap.data();
    if (!notif) return;

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) return;
    const userData  = userSnap.data()!;
    const fcmTokens: string[] = userData.fcmTokens || [];
    if (fcmTokens.length === 0) return;

    const { type, fromName, preview } = notif;
    let title = "Campus Connect";
    let body  = "";

    if (type === "like") {
      title = "❤️ New Like";
      body  = `${fromName} liked your post`;
    } else if (type === "comment") {
      title = "💬 New Comment";
      body  = `${fromName} commented: "${preview}"`;
    } else if (type === "follow") {
      title = "👤 New Follower";
      body  = `${fromName} started following you`;
    } else if (type === "conference") {
      title = "🏛️ Conference Hall";
      body  = `${fromName}: "${preview}"`;
    } else {
      body = `${fromName} sent you a notification`;
    }

    const results = await Promise.allSettled(
      fcmTokens.map(token =>
        fcm.send({
          token,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon: "/logo.png",
              badge: "/logo.png",
              vibrate: [200, 100, 200],
            },
            fcmOptions: {
              link: "https://campusconnect.tasu.edu.ng",
            },
          },
          android: {
            notification: {
              title,
              body,
              icon: "ic_launcher",
              color: "#16a34a",
              sound: "default",
            },
            priority: "high",
          },
          apns: {
            payload: {
              aps: {
                alert: { title, body },
                sound: "default",
                badge: 1,
              },
            },
          },
        })
      )
    );

    const invalidTokens: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const err = (result as PromiseRejectedResult).reason;
        if (
          err?.code === "messaging/invalid-registration-token" ||
          err?.code === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(fcmTokens[i]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await db.doc(`users/${uid}`).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      });
    }

    return null;
  });