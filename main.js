// EduTrack - Main JavaScript File
// Firebase Integration and Core Functionality (Modular SDK)

// Import Firebase modules (for bundler, e.g. webpack, vite, or via <script type="module"> in HTML)
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7anznG4-DR1ZftJoo7f9hesLK6EdDfqg",
  authDomain: "attendance-58849.firebaseapp.com",
  projectId: "attendance-58849",
  storageBucket: "attendance-58849.appspot.com",
  messagingSenderId: "137180005615",
  appId: "1:137180005615:web:5a2d8bc6892069f1c4071a",
  measurementId: "G-LRKMN76PEL"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const firebaseFirestore = getFirestore(app);
const firebaseStorage = getStorage(app);

console.log("Firebase initialized successfully");

// Authentication Functions
class AuthManager {
    static async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
            const user = userCredential.user;

            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified
            };
            localStorage.setItem("teacherToken", JSON.stringify(userData));
            return user;
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    }

    static async register(email, password, displayName, school) {
        try {
            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
            const user = userCredential.user;

            // Update display name
            await updateProfile(user, { displayName: displayName });

            // Store in Firestore
            await setDoc(doc(firebaseFirestore, "teachers", user.uid), {
                email,
                displayName,
                school,
                createdAt: serverTimestamp(),
                role: "teacher"
            });

            const userData = {
                uid: user.uid,
                email: user.email,
                displayName,
                emailVerified: user.emailVerified
            };
            localStorage.setItem("teacherToken", JSON.stringify(userData));

            return user;
        } catch (error) {
            console.error("Registration error:", error);
            throw error;
        }
    }

    static async logout() {
        await signOut(firebaseAuth);
        localStorage.removeItem("teacherToken");
        window.location.href = "login.html";
    }

    static getCurrentUser() {
        const token = localStorage.getItem("teacherToken");
        return token ? JSON.parse(token) : null;
    }

    static isAuthenticated() {
        return !!this.getCurrentUser();
    }
}

// Firestore Session Management
class SessionManager {
    static async createSession(courseName, date, duration, maxStudents) {
        const teacher = AuthManager.getCurrentUser();
        if (!teacher) throw new Error("Teacher not authenticated");

        const sessionData = {
            course: courseName,
            date,
            duration: parseInt(duration),
            maxStudents: parseInt(maxStudents),
            teacherId: teacher.uid,
            teacherName: teacher.displayName || teacher.email,
            startTime: new Date(),
            isActive: true,
            students: [],
            createdAt: serverTimestamp()
        };

        const sessionRef = doc(firebaseFirestore, "sessions", "session_" + Date.now());
        await setDoc(sessionRef, sessionData);

        return { id: sessionRef.id, ...sessionData };
    }

    static async getSession(sessionId) {
        const docRef = doc(firebaseFirestore, "sessions", sessionId);
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? snapshot.data() : null;
    }

    static async updateSession(sessionId, updates) {
        await updateDoc(doc(firebaseFirestore, "sessions", sessionId), updates);
    }

    static async closeSession(sessionId) {
        return this.updateSession(sessionId, { isActive: false });
    }

    static async addStudentToSession(sessionId, studentData) {
        const student = {
            ...studentData,
            timestamp: new Date(),
            id: "student_" + Date.now()
        };

        const sessionRef = doc(firebaseFirestore, "sessions", sessionId);

        await updateDoc(sessionRef, {
            students: [...(await (await getDoc(sessionRef)).data().students || []), student]
        });

        await addDoc(collection(firebaseFirestore, "attendance"), {
            sessionId,
            ...student,
            createdAt: serverTimestamp()
        });

        return student;
    }

    static listenToSession(sessionId, callback) {
        return onSnapshot(doc(firebaseFirestore, "sessions", sessionId), (docSnap) => {
            if (docSnap.exists()) callback(docSnap.data());
        });
    }
}

// Materials Manager (upload + fetch)
class MaterialsManager {
    static async uploadMaterial(file, course, description) {
        const teacher = AuthManager.getCurrentUser();
        if (!teacher) throw new Error("Teacher not authenticated");

        const fileRef = ref(firebaseStorage, `materials/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        const materialData = {
            title: file.name,
            course,
            type: this.getFileType(file.name),
            size: this.formatFileSize(file.size),
            description: description || "No description provided",
            uploadedBy: teacher.displayName || teacher.email,
            teacherId: teacher.uid,
            uploadDate: new Date().toISOString().split("T")[0],
            downloads: 0,
            fileUrl: downloadURL,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(firebaseFirestore, "materials"), materialData);
        return materialData;
    }

    static async getMaterials(filters = {}) {
        let q = collection(firebaseFirestore, "materials");
        let qFilters = [];

        if (filters.course) qFilters.push(where("course", "==", filters.course));
        if (filters.type) qFilters.push(where("type", "==", filters.type));

        if (qFilters.length > 0) {
            q = query(q, ...qFilters, orderBy("createdAt", "desc"));
        } else {
            q = query(q, orderBy("createdAt", "desc"));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    static getFileType(filename) {
        const ext = filename.split(".").pop().toLowerCase();
        const typeMap = { pdf: "PDF", doc: "DOC", docx: "DOC", ppt: "PPT", pptx: "PPT", jpg: "IMG", jpeg: "IMG", png: "IMG", gif: "IMG", mp4: "VIDEO", avi: "VIDEO", mov: "VIDEO" };
        return typeMap[ext] || "FILE";
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }
}

// ==============================
// Export if using Node/CommonJS
// ==============================
if (typeof module !== "undefined" && module.exports) {
    module.exports = { AuthManager, SessionManager, MaterialsManager };
}

console.log("EduTrack main.js loaded successfully");
