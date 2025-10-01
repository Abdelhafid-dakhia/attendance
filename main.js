// EduTrack - Main JavaScript File
// Firebase Integration and Core Functionality

// Firebase Configuration
const firebaseConfig = {
    // Replace with your Firebase project configuration
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase App Initialization
let firebaseApp = null;
let firebaseAuth = null;
let firebaseFirestore = null;
let firebaseStorage = null;

// Initialize Firebase (if Firebase SDK is loaded)
if (typeof firebase !== 'undefined') {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseFirestore = firebase.firestore();
        firebaseStorage = firebase.storage();
        
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// Authentication Functions
class AuthManager {
    static async login(email, password) {
        if (!firebaseAuth) {
            // Mock authentication for demo
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (email && password && password.length >= 6) {
                        const mockUser = {
                            uid: 'mock_user_' + Date.now(),
                            email: email,
                            displayName: 'Demo Teacher',
                            emailVerified: true
                        };
                        localStorage.setItem('teacherToken', JSON.stringify(mockUser));
                        resolve(mockUser);
                    } else {
                        reject(new Error('Invalid email or password'));
                    }
                }, 1000);
            });
        }
        
        try {
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Store user data in localStorage
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified
            };
            localStorage.setItem('teacherToken', JSON.stringify(userData));
            
            return user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async register(email, password, displayName, school) {
        if (!firebaseAuth) {
            // Mock registration for demo
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (email && password && password.length >= 6 && displayName && school) {
                        const mockUser = {
                            uid: 'mock_user_' + Date.now(),
                            email: email,
                            displayName: displayName,
                            emailVerified: false
                        };
                        localStorage.setItem('teacherToken', JSON.stringify(mockUser));
                        resolve(mockUser);
                    } else {
                        reject(new Error('Please fill in all fields correctly'));
                    }
                }, 1000);
            });
        }
        
        try {
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update user profile
            await user.updateProfile({
                displayName: displayName
            });
            
            // Store additional teacher data in Firestore
            if (firebaseFirestore) {
                await firebaseFirestore.collection('teachers').doc(user.uid).set({
                    email: email,
                    displayName: displayName,
                    school: school,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'teacher'
                });
            }
            
            // Store user data in localStorage
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                emailVerified: user.emailVerified
            };
            localStorage.setItem('teacherToken', JSON.stringify(userData));
            
            return user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    static logout() {
        if (firebaseAuth) {
            firebaseAuth.signOut();
        }
        localStorage.removeItem('teacherToken');
        window.location.href = 'login.html';
    }

    static getCurrentUser() {
        const token = localStorage.getItem('teacherToken');
        return token ? JSON.parse(token) : null;
    }

    static isAuthenticated() {
        return !!this.getCurrentUser();
    }
}

// Session Management
class SessionManager {
    static async createSession(courseName, date, duration, maxStudents) {
        const teacher = AuthManager.getCurrentUser();
        if (!teacher) {
            throw new Error('Teacher not authenticated');
        }

        const sessionData = {
            id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            course: courseName,
            date: date,
            duration: parseInt(duration),
            maxStudents: parseInt(maxStudents),
            teacherId: teacher.uid,
            teacherName: teacher.displayName || teacher.email,
            startTime: new Date(),
            isActive: true,
            students: [],
            createdAt: new Date()
        };

        if (firebaseFirestore) {
            try {
                await firebaseFirestore.collection('sessions').doc(sessionData.id).set(sessionData);
                console.log('Session created in Firestore:', sessionData.id);
            } catch (error) {
                console.error('Error creating session:', error);
                throw error;
            }
        }

        return sessionData;
    }

    static async getSession(sessionId) {
        if (firebaseFirestore) {
            try {
                const doc = await firebaseFirestore.collection('sessions').doc(sessionId).get();
                if (doc.exists) {
                    return doc.data();
                }
                return null;
            } catch (error) {
                console.error('Error getting session:', error);
                throw error;
            }
        }
        
        // Mock session for demo
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockSession = {
                    id: sessionId,
                    course: 'Demo Course',
                    date: new Date().toISOString().split('T')[0],
                    isActive: Math.random() > 0.1, // 90% chance of being active
                    students: []
                };
                resolve(mockSession);
            }, 500);
        });
    }

    static async updateSession(sessionId, updates) {
        if (firebaseFirestore) {
            try {
                await firebaseFirestore.collection('sessions').doc(sessionId).update(updates);
                console.log('Session updated:', sessionId);
            } catch (error) {
                console.error('Error updating session:', error);
                throw error;
            }
        }
    }

    static async closeSession(sessionId) {
        return this.updateSession(sessionId, { isActive: false });
    }

    static async addStudentToSession(sessionId, studentData) {
        const student = {
            ...studentData,
            timestamp: new Date(),
            id: 'student_' + Date.now()
        };

        if (firebaseFirestore) {
            try {
                await firebaseFirestore.collection('sessions').doc(sessionId).update({
                    students: firebase.firestore.FieldValue.arrayUnion(student)
                });
                
                // Also add to attendance collection for records
                await firebaseFirestore.collection('attendance').add({
                    sessionId: sessionId,
                    ...student,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('Student added to session:', student.name);
            } catch (error) {
                console.error('Error adding student:', error);
                throw error;
            }
        }

        return student;
    }

    static listenToSession(sessionId, callback) {
        if (firebaseFirestore) {
            return firebaseFirestore.collection('sessions').doc(sessionId)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        callback(doc.data());
                    }
                }, (error) => {
                    console.error('Error listening to session:', error);
                });
        }
        
        // Mock real-time updates for demo
        return setInterval(async () => {
            const session = await this.getSession(sessionId);
            callback(session);
        }, 5000);
    }
}

// Materials Management
class MaterialsManager {
    static async uploadMaterial(file, course, description) {
        const teacher = AuthManager.getCurrentUser();
        if (!teacher) {
            throw new Error('Teacher not authenticated');
        }

        try {
            let downloadURL = null;
            
            if (firebaseStorage) {
                // Upload to Firebase Storage
                const storageRef = firebaseStorage.ref();
                const fileRef = storageRef.child(`materials/${Date.now()}_${file.name}`);
                const snapshot = await fileRef.put(file);
                downloadURL = await snapshot.ref.getDownloadURL();
            }

            const materialData = {
                title: file.name,
                course: course,
                type: this.getFileType(file.name),
                size: this.formatFileSize(file.size),
                description: description || 'No description provided',
                uploadedBy: teacher.displayName || teacher.email,
                teacherId: teacher.uid,
                uploadDate: new Date().toISOString().split('T')[0],
                downloads: 0,
                fileUrl: downloadURL || URL.createObjectURL(file),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (firebaseFirestore) {
                await firebaseFirestore.collection('materials').add(materialData);
                console.log('Material uploaded:', materialData.title);
            }

            return materialData;
        } catch (error) {
            console.error('Error uploading material:', error);
            throw error;
        }
    }

    static async getMaterials(filters = {}) {
        if (firebaseFirestore) {
            try {
                let query = firebaseFirestore.collection('materials');
                
                if (filters.course) {
                    query = query.where('course', '==', filters.course);
                }
                if (filters.type) {
                    query = query.where('type', '==', filters.type);
                }
                
                const snapshot = await query.orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('Error getting materials:', error);
                throw error;
            }
        }
        
        // Return mock data for demo
        return this.getMockMaterials();
    }

    static async incrementDownload(materialId) {
        if (firebaseFirestore) {
            try {
                await firebaseFirestore.collection('materials').doc(materialId).update({
                    downloads: firebase.firestore.FieldValue.increment(1)
                });
            } catch (error) {
                console.error('Error incrementing download count:', error);
            }
        }
    }

    static getFileType(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const typeMap = {
            'pdf': 'PDF',
            'doc': 'DOC',
            'docx': 'DOC',
            'ppt': 'PPT',
            'pptx': 'PPT',
            'jpg': 'IMG',
            'jpeg': 'IMG',
            'png': 'IMG',
            'gif': 'IMG',
            'mp4': 'VIDEO',
            'avi': 'VIDEO',
            'mov': 'VIDEO'
        };
        return typeMap[extension] || 'PDF';
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    static getMockMaterials() {
        return [
            {
                id: 'mock_1',
                title: "Algebra Fundamentals.pdf",
                course: "Mathematics",
                type: "PDF",
                size: "2.4 MB",
                uploadedBy: "Dr. Sarah Johnson",
                uploadDate: "2025-09-28",
                downloads: 156,
                description: "Complete guide to algebraic concepts and problem-solving techniques."
            },
            {
                id: 'mock_2',
                title: "Chemistry Lab Safety.ppt",
                course: "Science",
                type: "PPT",
                size: "5.1 MB",
                uploadedBy: "Prof. Michael Chen",
                uploadDate: "2025-09-27",
                downloads: 89,
                description: "Essential safety protocols and procedures for chemistry laboratory work."
            }
            // Add more mock materials as needed
        ];
    }
}

// Utility Functions
class Utils {
    static showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        anime({
            targets: notification,
            opacity: [0, 1],
            translateX: [100, 0],
            duration: 300,
            easing: 'easeOutQuad'
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            anime({
                targets: notification,
                opacity: [1, 0],
                translateX: [0, 100],
                duration: 300,
                easing: 'easeInQuad',
                complete: () => {
                    document.body.removeChild(notification);
                }
            });
        }, 3000);
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static generateQRCode(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (typeof QRCode !== 'undefined') {
                const canvas = document.createElement('canvas');
                QRCode.toCanvas(canvas, text, {
                    width: options.width || 200,
                    margin: options.margin || 2,
                    color: {
                        dark: options.darkColor || '#1a365d',
                        light: options.lightColor || '#ffffff'
                    }
                }, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(canvas);
                    }
                });
            } else {
                reject(new Error('QRCode library not loaded'));
            }
        });
    }

    static copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve();
        }
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Utils.showNotification('An error occurred. Please try again.', 'error');
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthManager,
        SessionManager,
        MaterialsManager,
        Utils
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    const currentUser = AuthManager.getCurrentUser();
    
    // Redirect to login if accessing protected pages without authentication
    const protectedPages = ['dashboard.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !currentUser) {
        window.location.href = 'login.html';
    }
    
    // Add global keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Ctrl/Cmd + K for search (if search input exists)
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape to clear focus
        if (event.key === 'Escape') {
            document.activeElement.blur();
        }
    });
});

console.log('EduTrack main.js loaded successfully');