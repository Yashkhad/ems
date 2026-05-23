module.exports = (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "EMS Attendance API",
    version: "1.0.0"
  });
};
