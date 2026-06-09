const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.post('/finish-game', async (req, res) => {
  const { gameId, hostChoice, guestChoice, hostId, guestId, stake } = req.body;

  if (!gameId || !hostChoice || !guestChoice || !hostId || !guestId || !stake) {
    return res.status(400).json({ error: 'Не все данные переданы' });
  }

  const winAmount = Math.floor(stake * 0.95);
  let winnerUid = null;
  let isDraw = false;

  if (hostChoice === guestChoice) {
    isDraw = true;
  } else if (
    (hostChoice === 'rock' && guestChoice === 'scissors') ||
    (hostChoice === 'scissors' && guestChoice === 'paper') ||
    (hostChoice === 'paper' && guestChoice === 'rock')
  ) {
    winnerUid = hostId;
  } else {
    winnerUid = guestId;
  }

  const batch = db.batch();

  if (!isDraw && winnerUid) {
    batch.update(db.collection('users').doc(winnerUid), {
      coins: admin.firestore.FieldValue.increment(winAmount),
      wins: admin.firestore.FieldValue.increment(1)
    });
  }

  batch.update(db.collection('openGames').doc(gameId), {
    status: 'finished',
    winner: winnerUid || 'draw',
    winAmount: winAmount,
    finishedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
  res.json({ winner: winnerUid || 'draw', winAmount });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));