import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { email, aqi, location } = await req.json();

        let transporter;
        let isTest = false;

        // If user configured real SMTP
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        } else {
            // No .env setup? Use Ethereal Test Account!
            isTest = true;
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user, // generated ethereal user
                    pass: testAccount.pass, // generated ethereal password
                },
            });
        }

        const mailOptions = {
            from: `"Respira Flare System" <${process.env.EMAIL_USER || 'no-reply@respiraflare.test'}>`,
            to: email, // Directly to the user's logged in Email
            subject: aqi > 200 ? 'CRITICAL ALARM: Hazardous Air Quality' : 'Air Quality Health Warning',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: ${aqi > 200 ? '#ef4444' : '#f59e0b'}; margin-bottom: 5px;">
                        ${aqi > 200 ? '🚨 Critical Health Hazard Detected' : '⚠️ Health Protocol Warning'}
                    </h2>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 20px;"/>
                    
                    <p style="font-size: 16px;">This is an automated dispatch for your active location:</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 16px; color: #333;"><strong>Location:</strong> ${location}</p>
                        <p style="margin: 8px 0 0 0; font-size: 16px; color: #333;"><strong>Current AQI:</strong> <span style="color: ${aqi > 200 ? '#ef4444' : '#f59e0b'}; font-weight: bold;">${aqi}</span></p>
                    </div>

                    <p style="font-size: 16px; line-height: 1.5; color: #555;">${
                        aqi > 200 
                        ? '<strong>URGENT:</strong> The air quality is extremely hazardous to human health! Please avoid all outdoor physical activity. Ensure all windows are closed and wear a N95 mask if you must go outside.'
                        : '<strong>WARNING:</strong> Air quality is currently unhealthy. Sensitive groups and individuals with asthma should reduce prolonged outdoor exertion.'
                    }</p>
                    
                    <br/>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                        This is an automated alert from your Respira Flare Profile Settings.<br/>
                        Stay safe!
                    </p>
                </div>
            `
        };

        // Send the mail!
        const info = await transporter.sendMail(mailOptions);
        
        let testUrl = null;
        if (isTest) {
            testUrl = nodemailer.getTestMessageUrl(info);
            console.log("Preview URL: " + testUrl);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Real Email dispatched successfully!',
            testUrl 
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
