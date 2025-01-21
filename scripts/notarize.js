require("dotenv").config()
const { notarize } = require("@electron/notarize")

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== "darwin") {
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appBundleId = context.packager.config.appId

  return await notarize({
    tool: "notarytool",
    appBundleId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  })
}
