const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const artifactDir = 'C:/Users/91883/.gemini/antigravity/brain/941f2fd9-72cb-4736-bdbf-c50579857895';
  
  const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'] 
  });
  const page = await browser.newPage();
  
  console.log("Taking Mobile Login Screenshot...");
  // 1. Mobile Login
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:5173/login', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: `${artifactDir}/fig5_1_mobile_login.png` });
  
  // Employee Login
  console.log("Logging in as Employee...");
  try {
    await page.type('input[type="email"]', 'sujal.ghagare@ems.com');
    await page.type('input[type="password"]', 'password123'); // Adjust if needed
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000)); // wait for navigation
    
    console.log("Taking Mobile Dashboard Screenshot...");
    // 2. Mobile Dashboard
    await page.screenshot({ path: `${artifactDir}/fig5_2_mobile_dashboard.png` });
    
    // 3. Mark Attendance Screen
    // We try to find a button that says 'Mark Attendance' or just navigate to /attendance
    console.log("Taking Mobile Attendance Screenshot...");
    await page.goto('http://localhost:5173/attendance', {waitUntil: 'networkidle2'}).catch(()=>{});
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${artifactDir}/fig5_3_mobile_attendance.png` });

    console.log("Taking Mobile Leave Screenshot...");
    // 4. Mobile Leave Application
    await page.goto('http://localhost:5173/leave', {waitUntil: 'networkidle2'}).catch(()=>{});
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${artifactDir}/fig5_4_mobile_leave.png` });
    
    // Logout
    await page.goto('http://localhost:5173/login');
    await new Promise(r => setTimeout(r, 1000));
  } catch(e) {
      console.log("Employee flow failed", e);
  }

  // Admin Desktop
  console.log("Logging in as Admin...");
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/login', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 1000));
  try {
    // We might need to clear the inputs if they are pre-filled
    await page.evaluate(() => {
        document.querySelectorAll('input').forEach(i => i.value = '');
    });
    await page.type('input[type="email"]', 'admin@ems.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));
    
    console.log("Taking Admin Dashboard Screenshot...");
    // 5. Desktop Admin Dashboard
    await page.screenshot({ path: `${artifactDir}/fig5_5_admin_dashboard.png` });
    
    console.log("Taking Employee Mgmt Screenshot...");
    // 6. Employee Management
    await page.goto('http://localhost:5173/employees', {waitUntil: 'networkidle2'}).catch(()=>{});
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${artifactDir}/fig5_6_employee_mgmt.png` });
    
    console.log("Taking Leave Approval Screenshot...");
    // 7. Leave Approval
    await page.goto('http://localhost:5173/leaves', {waitUntil: 'networkidle2'}).catch(()=>{});
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${artifactDir}/fig5_7_leave_approval.png` });

    console.log("Taking Reports Screenshot...");
    // 8. Reports
    await page.goto('http://localhost:5173/reports', {waitUntil: 'networkidle2'}).catch(()=>{});
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${artifactDir}/fig5_8_reports.png` });
  } catch(e) {
      console.log("Admin flow failed", e);
  }

  await browser.close();
  console.log("DONE");
})();
