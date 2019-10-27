const elliptic = require("elliptic").ec,
  fs = require("fs"),
  path = require("path"),
  _ = require("lodash"),
  Transactions = require("./transactions")

const { getPublicKey, getTxId, signTxIn, TxIn, Transaction, TxOut } = Transactions
const ec = new elliptic("secp256k1")

const privateKeyLocation = path.join(__dirname, "privateKey")

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair()
  const privateKey = keyPair.getPrivate()
  return privateKey.toString(16)
}

const getPrivateFromWallet = () => {
  const buffer = fs.readFileSync(privateKeyLocation, "utf-8")
  return buffer.toString()
}

const getPublicFromWallet = () => {
  const privateKey = getPrivateFromWallet()
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

const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => {
  let currentAmount = 0
  const includedUTxOuts = []
  for (const myUTxOut of myUTxOuts) {
    includedUTxOuts.push(myUTxOut)
    currentAmount = currentAmount + myUTxOut.amount
    if (currentAmount >= amountNeeded) {
      const leftoverAmount = currentAmount - amountNeeded
      // console.log("findAmountInUTxOuts", leftoverAmount, currentAmount, amountNeeded)
      return { includedUTxOuts, leftoverAmount }
    }
  }
  throw Error("Not enough funds")
  return false
}

const createTxOuts = (receiverAddress, myAddress, amount, leftoverAmount) => {
  const receiverTxOut = new TxOut(receiverAddress, amount)
  if (leftoverAmount === 0) {
    return [receiverTxOut]
  } else {
    const leftoverTxOut = new TxOut(myAddress, leftoverAmount)
    return [receiverTxOut, leftoverTxOut]
  }
}

const createTx = (receiverAddress, amount, privateKey, uTxOutList) => {
  const myAddress = getPublicKey(privateKey)
  const myUTxOuts = uTxOutList.filter(uTxO => uTxO.address === myAddress)

  const { includedUTxOuts, leftoverAmount } = findAmountInUTxOuts(amount, myUTxOuts)

  const toUnsignedTxIn = uTxOut => {
    const txIn = new TxIn()
    txIn.txOutId = uTxOut.txOutId
    txIn.txOutIndex = uTxOut.txOutIndex
    return txIn
  }

  const unsignedTxIns = includedUTxOuts.map(toUnsignedTxIn)

  const tx = new Transaction()

  tx.txIns = unsignedTxIns
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftoverAmount)

  tx.id = getTxId(tx)

  tx.txIns = tx.txIns.map((txIn, index) => {
    txIn.signature = signTxIn(tx, index, privateKey, uTxOutList)
    return txIn
  })

  return tx
}

module.exports = {
  initWallet,
  getBalance,
  getPublicFromWallet,
  createTx,
  getPrivateFromWallet
}
