import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log(`[Firebase] Server Firestore initialized successfully using Client SDK. DB ID: ${firebaseConfig.firestoreDatabaseId}`);
  } else {
    console.warn("[Firebase] firebase-applet-config.json not found. Firestore is disabled.");
  }
} catch (error) {
  console.error("[Firebase] Failed to initialize Firebase Firestore:", error);
}

export { db };

// Retrieve all items in a collection
export async function getCollectionData<T>(collectionName: string): Promise<T[]> {
  if (!db) {
    console.warn(`[Firebase] Firestore is not initialized. Cannot fetch collection ${collectionName}`);
    return [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data: T[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ ...doc.data(), id: doc.id } as any);
    });
    return data;
  } catch (error) {
    console.error(`[Firebase] Error fetching collection ${collectionName}:`, error);
    return [];
  }
}

// Write/update a single document in a collection
export async function setDocument(collectionName: string, docId: string, data: any): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error(`[Firebase] Error writing document ${docId} to ${collectionName}:`, error);
  }
}

// Delete a single document from a collection
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  if (!db) return;
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`[Firebase] Error deleting document ${docId} from ${collectionName}:`, error);
  }
}

// Delete all documents in a collection (useful for full resets)
export async function clearCollection(collectionName: string): Promise<void> {
  if (!db) return;
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.delete(doc(db, collectionName, document.id));
    });
    await batch.commit();
    console.log(`[Firebase] Collection ${collectionName} cleared successfully.`);
  } catch (error) {
    console.error(`[Firebase] Error clearing collection ${collectionName}:`, error);
  }
}
