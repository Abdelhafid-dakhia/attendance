# Attendance Tracking System - Interaction Design

## User Flows

### Teacher Flow
1. **Registration/Login**: Teachers create account or login with email/password
2. **Dashboard**: Access to all teacher functionalities
   - Generate QR codes for attendance
   - View attendance records
   - Upload course materials
   - Manage profile
3. **QR Generation**: Enter course name and date to generate unique QR code
4. **Attendance Monitoring**: Real-time view of student check-ins
5. **Material Management**: Upload and organize course materials

### Student Flow
1. **QR Scanning**: Scan teacher-generated QR code
2. **Attendance Form**: Auto-populated form with course and date
3. **Quick Submission**: Fill name and student ID, submit attendance
4. **Confirmation**: Immediate feedback on successful submission

## Interactive Components

### 1. QR Code Generator (Teacher Dashboard)
- Input fields: Course Name, Date, Session Duration
- Generate button creates unique QR code with session ID
- Display QR code with download option
- **Active Session Control**: Teacher can start/pause/close attendance session
- **Real-time Status**: Shows number of students checked in
- **Session Timer**: Countdown showing remaining time
- **Close Session**: Immediately disables attendance form access

### 2. Attendance Tracker (Teacher Dashboard)
- Filter by course and date
- Real-time updates as students check in
- Export attendance data
- Visual statistics and charts

### 3. Material Upload System (Teacher Dashboard)
- Drag-and-drop file upload
- Course categorization
- File management (delete, update)
- Sharing permissions

### 4. Student Attendance Form
- Auto-filled course and date from QR
- Quick input: Full Name, Group, Level
- Submit button with loading state
- **Session Validation**: Checks if attendance session is active
- **Error Handling**: Shows message if session is closed
- Success confirmation with timestamp
- **Real-time Updates**: Shows current session status

## Navigation Structure
- **Home**: System overview and quick access
- **Teacher Login**: Authentication page
- **Dashboard**: Teacher control center
- **Attendance**: Student check-in form
- **Materials**: Shared course resources