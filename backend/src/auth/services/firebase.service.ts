import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';

let admin: any;
try {
  admin = require('firebase-admin');
} catch {
  admin = null;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: any = null;

  onModuleInit() {
    if (!admin) return;
    if (admin.apps?.length) {
      this.app = admin.app();
      return;
    }
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      this.app = admin.initializeApp({ credential: admin.credential.cert(serviceAccountPath) });
      return;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (projectId && clientEmail && privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '');
      this.app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    }
  }

  async verifyIdToken(idToken: string): Promise<any> {
    if (!admin || !this.app) throw new Error('Firebase not configured');
    return await admin.auth().verifyIdToken(idToken);
  }
}
