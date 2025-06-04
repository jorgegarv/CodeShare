require('dotenv').config();
const express = require('express');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const shortid = require('shortid');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const sanitizeHtml = require('sanitize-html');

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const app = express();
app.use('/images', express.static('public/images'));
app.get('/js/paste.js', (req, res) => {
  res.sendFile(__dirname + '/public/js/paste.js');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('trust proxy', true); 

const checkAuth = async (req, res, next) => {
  const sessionCookie = req.cookies.session || '';
  try {
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);
    req.user = decodedClaims;
  } catch {
    req.user = null;
  }
  next();
};

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados pastes creados. Intenta en 15 minutos.' }
});

// Limpiar contadores antiguos cada hora
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [ip, data] of attemptsByIP.entries()) {
    if (data.lastAttempt < oneHourAgo) {
      attemptsByIP.delete(ip);
    }
  }
}, 60 * 60 * 1000);

app.use((req, res, next) => {
  res.locals.sanitizeCode = (code) => {
    return sanitizeHtml(code, {
      allowedTags: [], 
      allowedAttributes: {},
      textFilter: (text) => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    });
  };
  next();
});

app.get('/', checkAuth, (req, res) => {
  res.render('index', { user: req.user });
});

app.post('/create', createLimiter,checkAuth, async (req, res) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;

    let { content, title = 'Sin título', captcha, type = 'text' } = req.body;

    if (!content || typeof content !== 'string') throw new Error('Contenido requerido');
    if (typeof title !== 'string') throw new Error('Título inválido');

    if (!captcha || typeof captcha !== 'string') {
      return res.status(400).json({ error: 'CAPTCHA requerido' });
    }

    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const params = new URLSearchParams();
    params.append('secret', RECAPTCHA_SECRET);
    params.append('response', captcha);
    params.append('remoteip', clientIp);

    const response = await axios.post(verificationUrl, params);
    const data = response.data;

    if (!data.success) {
      return res.status(400).json({ error: 'CAPTCHA no válido' });
    }

    content = content.trim().substring(0, 10000);
    title = title.trim().substring(0, 100);
    if (content.length < 1) throw new Error('El contenido no puede estar vacío');

    const urlId = shortid.generate();
    const pasteData = {
      title,
      content,
      urlId,
      createdAt: new Date().toISOString(),
      public: true,
      ip: clientIp
    };

    if (req.user) {
      pasteData.userId = req.user.uid;
      pasteData.userName = req.user.name;
      pasteData.userEmail = req.user.email;
      pasteData.userPhoto = req.user.picture;
    }

    await db.collection('pastes').doc(urlId).set(pasteData);
    
    res.json({ urlId, paste: pasteData });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/sessionLogin', async (req, res) => {
  const idToken = req.body.idToken;
  const expiresIn = 60 * 60 * 24 * 5 * 1000;
  try {
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    res.cookie('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    res.json({ status: 'success' });
  } catch {
    res.status(401).json({ error: 'Error de autenticación' });
  }
});

app.post('/sessionLogout', (req, res) => {
  res.clearCookie('session');
  res.json({ status: 'success' });
});

app.get('/:urlId', async (req, res) => {
  try {
    const doc = await db.collection('pastes').doc(req.params.urlId).get();
    if (doc.exists) return res.render('paste', { paste: doc.data() });

    res.render('paste', {
      paste: {
        urlId: req.params.urlId,
        isLocal: true
      }
    });
  } catch {
    res.status(500).send('Error al cargar el paste');
  }
});

app.get('/api/pastes', checkAuth, async (req, res) => {
  try {
    if (!req.user) return res.json([]);
    const snapshot = await db.collection('pastes')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const pastes = snapshot.docs.map(doc => doc.data());
    res.json(pastes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener pastes" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT);