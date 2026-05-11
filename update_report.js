const fs = require('fs');
const file = 'C:/Users/91883/.gemini/antigravity/brain/941f2fd9-72cb-4736-bdbf-c50579857895/complete_internship_report.md';
let text = fs.readFileSync(file, 'utf8');

const replacement = `### 6.1 WEEKLY OVERVIEW OF FEATURES DEVELOPED
The internship spanned a comprehensive period of 21 weeks. The development of the Employee Management System (EMS) was meticulously structured across these weeks, transitioning from initial research and planning to full-scale development, testing, and final documentation.

**Week 1: Company Onboarding and Requirements Gathering**
The first week focused on completing official company onboarding procedures. This included meetings with the HR department, getting acquainted with the corporate culture, and gathering the core software requirements directly from the stakeholders to understand the scope of the Employee Management System.

**Week 2: Literature Review and Feasibility Study**
Conducted an extensive literature review on existing attendance tracking mechanisms. A feasibility study was performed to evaluate the viability of utilizing browser-based biometric authentication over traditional fingerprint scanners, ensuring the project was technologically achievable.

**Week 3: Technology Stack Selection**
Dedicated time to analyzing and finalizing the technology stack. React.js, Node.js, Express, and MySQL were selected based on their robust community support, scalability, and suitability for building enterprise-level, real-time web applications.

**Week 4: System Architecture and Database Schema Design**
Drafted the Entity-Relationship (ER) models and designed the three-tier system architecture. This week was crucial for planning how data would flow between the frontend interface, the backend server, and the database, ensuring a solid structural foundation.

**Week 5: Development Environment Setup and Version Control**
Configured the local development environment by installing Node.js, Vite, and Prisma. Initialized the project repositories on GitHub to establish strict version control protocols, enabling structured and safe code commits.

**Week 6: Database Initialization and Seeding (Prisma/MySQL)**
Set up the MySQL database instance and mapped it using the Prisma Object-Relational Mapper (ORM). Developed database seeding scripts to populate the tables with mock data (dummy employees and departments) to facilitate initial backend testing.

**Week 7: Backend API - Authentication Architecture**
Focused entirely on building the backend security layer. Implemented secure password hashing using bcrypt and generated JSON Web Tokens (JWT) to create robust, stateless session management for logging in employees securely.

**Week 8: Backend API - Role-Based Access Control (RBAC)**
Developed specialized Express middleware to handle Role-Based Access Control. This ensured that sensitive API endpoints (like deleting an employee or viewing master reports) were strictly restricted to users with 'Admin' or 'HR' privileges.

**Week 9: Frontend Initialization and UI Framework**
Transitioned focus to the client side by initializing the React frontend using Vite. Configured Tailwind CSS to streamline styling, established global color palettes, and set up the foundational React Router for navigating between application pages.

**Week 10: Frontend UI - Login and Registration Interfaces**
Designed and programmed the responsive user interfaces for the Login and Registration screens. Ensured that these forms were accessible on mobile devices and included rigorous client-side validation logic to prevent erroneous data submission.

**Week 11: Frontend/Backend Integration**
Successfully bridged the React frontend with the secure Node.js backend. Integrated the login forms with the authentication APIs, allowing users to submit credentials, receive a JWT token, and be programmatically redirected to their personalized dashboards.

**Week 12: Biometric Research and face-api.js Prototyping**
Dedicated to researching the intricacies of the face-api.js library. Downloaded and configured the necessary pre-trained neural network models for face detection and descriptor extraction within the standard browser environment.

**Week 13: Implementing Camera Access in React**
Developed custom React components to securely request and access the user's device camera using the HTML5 MediaDevices API. Implemented a seamless live video feed directly within the attendance marking interface.

**Week 14: Integrating Facial Descriptors**
Integrated face-api.js directly with the live video feed. Programmed the complex logic required to detect a human face, draw visual bounding boxes on the canvas, and extract the 128-dimensional mathematical descriptor of the user's face during the registration phase.

**Week 15: Facial Recognition Matching Algorithm**
Developed the core biometric matching logic. Wrote the algorithm to calculate the Euclidean distance between the live facial descriptor captured during the daily check-in and the secure descriptor stored in the database, accurately verifying the user's identity.

**Week 16: Research and Implementation of Geolocation Services**
Transitioned to fulfilling the location-based security requirement. Researched the HTML5 Geolocation API, focusing on handling browser location permissions gracefully and fetching the user's precise latitude and longitude coordinates securely.

**Week 17: Developing the Geofencing Logic (Haversine formula)**
Implemented the mathematical Haversine formula on the backend server. This logic calculates the exact geographical distance between the employee's current fetched coordinates and the fixed office location coordinates, ensuring attendance is strictly marked on-site.

**Week 18: Leave Management Workflow Development**
Developed the comprehensive leave management module. Built the frontend application forms for employees to submit leave requests, and the corresponding backend APIs to handle submissions, updates, and hierarchical managerial approvals.

**Week 19: Administrative Dashboard and Analytics**
Focused on building the Admin Dashboard interface. Developed complex MySQL queries to fetch organizational statistics and utilized charting libraries on the frontend to visualize attendance trends, total active personnel, and pending workflows.

**Week 20: End-to-End System Testing and Optimization**
Conducted rigorous Quality Assurance (QA) and end-to-end testing. Performed manual UI testing across different mobile devices and browsers, optimized the loading times of the heavy AI models, and resolved persistent UI glitches to ensure a smooth user experience.

**Week 21: Documentation, Report Writing, and Final Presentation**
The final week was dedicated entirely to project documentation. Compiled the comprehensive internship report, created detailed system architectural diagrams, recorded project demonstration videos, and prepared for the final academic evaluation and presentation.`;

const startTag = '### 6.1 WEEKLY OVERVIEW OF FEATURES DEVELOPED';
const endTag = '### 6.2 DISCUSSION WITH INTERNSHIP MENTOR';

const startIndex = text.indexOf(startTag);
const endIndex = text.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
    const before = text.substring(0, startIndex);
    const after = text.substring(endIndex);
    const newText = before + replacement + '\n\n' + after;
    fs.writeFileSync(file, newText);
    console.log('Successfully updated Chapter 6.1');
} else {
    console.log('Tags not found.');
}
