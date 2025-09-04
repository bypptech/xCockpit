import { Router } from 'express';
import { FarcasterVerifier, validateFarcasterEnvVars } from '../lib/farcaster-verify';

const router = Router();
const APP_URL = process.env.FARCASTER_APP_URL || 'https://202509vibecodingminihackerson.bypp.tech';
const verifier = new FarcasterVerifier(APP_URL);

// Frame metadata endpoint
router.get('/frame', (req, res) => {
  console.log('🔵 Frame GET request received');
  
  // Validate environment variables
  const envValidation = validateFarcasterEnvVars();
  
  res.json({
    message: "Nagesen Gacha Live Frame endpoint ready",
    appUrl: APP_URL,
    version: "vNext",
    environmentValid: envValidation.isValid,
    errors: envValidation.errors,
    manifest: {
      name: "Nagesen Gacha Live",
      description: "Live-streamed Gacha machine controllable via USDC tipping",
      url: APP_URL,
      icon: "/icon.png"
    },
    frameMetadata: {
      "fc:frame": "vNext",
      "fc:frame:image": `${APP_URL}/api/frame/image`,
      "fc:frame:button:1": "💰 Tip & Trigger Gacha",
      "fc:frame:button:2": "📊 View Stats", 
      "fc:frame:button:3": "🎬 Watch Live",
      "fc:frame:post_url": `${APP_URL}/api/frame`
    }
  });
});

// Frame POST handler
router.post('/frame', async (req, res) => {
  try {
    const { untrustedData, trustedData } = req.body;
    
    console.log('🔵 Frame POST received:', { untrustedData, trustedData });
    
    // 1. Environment validation
    const envValidation = validateFarcasterEnvVars();
    if (!envValidation.isValid) {
      console.error('❌ Environment validation failed:', envValidation.errors);
    }

    // 2. Frame message verification
    const frameValidation = await verifier.verifyFrameMessage({
      untrustedData,
      trustedData
    });
    
    if (!frameValidation.isValid) {
      console.error('❌ Frame validation failed:', frameValidation.errors);
    }

    // 3. JWT payload verification (if environment variables are set)
    if (envValidation.header && envValidation.payload) {
      const payloadValidation = verifier.verifyPayload(
        envValidation.header,
        envValidation.payload
      );
      
      if (!payloadValidation.isValid) {
        console.error('❌ Payload validation failed:', payloadValidation.errors);
      } else {
        console.log('✅ Payload validation passed');
      }
    }

    // 4. Button action handling
    const buttonIndex = untrustedData?.buttonIndex;
    const fid = untrustedData?.fid;
    
    console.log(`🔵 Button ${buttonIndex} pressed by FID ${fid}`);

    let responseData;

    switch (buttonIndex) {
      case 1: // 💰 Tip & Trigger Gacha
        responseData = {
          type: "frame",
          version: "vNext",
          image: `${APP_URL}/api/frame/image?action=payment&fid=${fid}`,
          buttons: [
            {
              text: "💵 Pay 0.100 USDC",
              action: "post"
            },
            {
              text: "🎬 Watch Live",
              action: "link", 
              target: APP_URL
            }
          ],
          input: {
            text: "Enter tip amount (USDC)"
          },
          postUrl: `${APP_URL}/api/frame/payment`
        };
        break;

      case 2: // 📊 View Stats
        responseData = {
          type: "frame",
          version: "vNext",
          image: `${APP_URL}/api/frame/image?action=stats&fid=${fid}`,
          buttons: [
            {
              text: "🔄 Refresh Stats",
              action: "post"
            },
            {
              text: "💰 Make Payment",
              action: "post"
            },
            {
              text: "🎬 Watch Live",
              action: "link",
              target: APP_URL
            }
          ],
          postUrl: `${APP_URL}/api/frame`
        };
        break;

      case 3: // 🎬 Watch Live (Link)
        return res.redirect(APP_URL);

      default: // Initial frame
        responseData = {
          type: "frame",
          version: "vNext", 
          image: `${APP_URL}/api/frame/image?action=welcome&fid=${fid}`,
          buttons: [
            {
              text: "💰 Tip & Trigger Gacha",
              action: "post"
            },
            {
              text: "📊 View Stats", 
              action: "post"
            },
            {
              text: "🎬 Watch Live",
              action: "link",
              target: APP_URL
            }
          ],
          postUrl: `${APP_URL}/api/frame`
        };
    }

    res.json(responseData);

  } catch (error) {
    console.error('❌ Frame API error:', error);
    
    // Error fallback frame
    res.json({
      type: "frame",
      version: "vNext",
      image: `${APP_URL}/api/frame/image?action=error`,
      buttons: [
        {
          text: "🔄 Try Again",
          action: "post"
        },
        {
          text: "🎬 Visit Site",
          action: "link",
          target: APP_URL
        }
      ],
      postUrl: `${APP_URL}/api/frame`
    });
  }
});

// Frame image generation (placeholder)
router.get('/frame/image', (req, res) => {
  const action = req.query.action || 'welcome';
  const fid = req.query.fid || '0';
  
  console.log(`🖼️ Frame image request: action=${action}, fid=${fid}`);
  
  // Simple SVG placeholder - in production, generate proper images
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6B46C1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#EC4899;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <text x="600" y="200" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">
        🎰 Nagesen Gacha Live
      </text>
      <text x="600" y="280" font-family="Arial, sans-serif" font-size="32" fill="rgba(255,255,255,0.9)" text-anchor="middle">
        Action: ${action}
      </text>
      <text x="600" y="340" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        FID: ${fid}
      </text>
      <text x="600" y="450" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.7)" text-anchor="middle">
        USDC投げ銭でガチャマシンを操作
      </text>
      <circle cx="1050" cy="150" r="40" fill="#2775CA"/>
      <text x="1050" y="165" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="white" text-anchor="middle">$</text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Test endpoint for custody address verification
router.post('/frame/test-verify', async (req, res) => {
  try {
    const { message, signature, fid } = req.body;
    
    console.log('🧪 Testing custody address verification');
    
    const result = await verifier.verifyCustodyAddress(message, signature, fid);
    
    res.json({
      success: true,
      verification: result,
      message: "Custody address verification test completed - check console logs"
    });
  } catch (error) {
    console.error('❌ Verification test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;