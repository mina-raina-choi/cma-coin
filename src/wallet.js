const elliptic = require("elliptic").ec
fs = require("fs")
path = require("path")

const ec = new elliptic("secp256k1")

const privateKeyLocation = path.join(__dirname, "privateKey")

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair()
  const privatekey = keyPair.getPrivate()
  return privatekey.toString(16)
}

const initWallet = () => {
  if (fs.existsSync(privateKeyLocation)) {
    return
  }
  const newPrivateKey = generatePrivateKey()

  fs.writeFileSync(privateKeyLocation, newPrivateKey)
}

module.exports = {
  initWallet
}
