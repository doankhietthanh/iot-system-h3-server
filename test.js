const nameSensorList = Object.keys(data.sensors);
const valueSensorList = Object.values(data.sensors);

setInterval(() => {
  nameSensorList.forEach((nameSensor, index) => {
    const valueSensor = valueSensorList[index];
    if (valueSensor > docsValueSensorsThreshold[nameSensor]) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "19119220@student.hcmute.edu.vn", // generated ethereal user
          pass: "Thanh2001@", // generated ethereal password
        },
      });

      const mailOptions = {
        from: "19119220@student.hcmute.edu.vn", // sender address
        to: "19119088@student.hcmute.edu.vn", // subject
        subject: "Threshold exceeded", // body
        html: `
        <h3>❌❌❌ THRESHOLD EXCEEDED</h3> ❌❌❌</h3>
        <h3>At ${timestamp} 🏠</h3>
        <p>${nameLocation} --- ${node} 🔒</p>
        <p>${nameSensor} has a value of ${valueSensor}, exceeding the threshold of ${docsValueSensorsThreshold[nameSensor]}</p>`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    }
  });
}, 3 * 60000);
