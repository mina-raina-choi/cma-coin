const elliptic = require("elliptic").ec,
  fs = require("fs"),
  path = require("path"),
  lodash = require("lodash")

const ec = new elliptic("secp256k1")

const privateKeyLocation = path.join(__dirname, "privateKey")

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair()
  const privatekey = keyPair.getPrivate()
  return privatekey.toString(16)
}

const getPrivateKeyFromWallet = () => {
  const buffer = fs.readFileSync(privateKeyLocation, "utf-8")
  buffer.toString()
}

const getPublicFromWallet = () => {
  const privateKey = getPrivateKeyFromWallet()
  const key = ec.keyFromPrivate(privateKey, "hex")
  return key.getPublic().encode("hex")
}

const getBalance = (address, uTxOuts) => {
  return _(uTxOuts)
    .filter(uTxO => uTxO.address === address)
    .map(uTxO => uTxO.amount)
    .sum()
}

const initWallet = () => {
  if (fs.existsSync(privateKeyLocation)) {
    return
  }
  const newPrivateKey = generatePrivateKey()

  fs.writeFileSync(privateKeyLocation, newPrivateKey)
}

module.exports = {
  initWallet,
  getBalance
}
