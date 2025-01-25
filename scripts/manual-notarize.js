require("dotenv").config()
const { notarize } = require("@electron/notarize")
const path = require("path")

async function notarizeApp(dmgPath) {
  const fullPath = path.resolve(
    __dirname,
    "..",
    dmgPath || "release/Interview Coder-x64.dmg"
  )
  console.log("Starting notarization...")
  console.log("DMG Path:", fullPath)

  try {
    await notarize({
      tool: "notarytool",
      appPath: fullPath,
      appBundleId: "com.chunginlee.interviewcoder",
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    })
    console.log("Notarization complete!")
  } catch (error) {
    console.error("Error during notarization:", error)
  }
}

if (require.main === module) {
  notarizeApp(process.argv[2])
}

module.exports = { notarizeApp }
