const CryptoJS = require("crypto-js"),
  EC = require("elliptic").ec
utils = require("./utils")

const ec = new EC("secp256k1")

const COINBASE_AMOUNT = 50

class TxOut {
  constructor(address, amount) {
    this.address = address
    this.amount = amount
  }
}

// utxo : 아직 사용하지 않은 아웃풋
class TxIn {
  // txOutId
  // txOutIndex
  // signature
}

class Transaction {
  // id
  // txIns[]
  // txOuts []
}

class UTxOut {
  constructor(txOutId, txOutIndex, address, amount) {
    // txid
    this.txOutId = txOutId
    // vout
    this.txOutIndex = txOutIndex
    this.address = address
    this.amount = amount
  }
}

const uTxOuts = []

const getTxId = tx => {
  // 인풋의 id + index를 가져와서 문자열을 계속 합쳐준다.
  const txInContent = tx.txIns
    .map(txIn => txIn.uTxOutId + txIn.uTxOutIndex)
    .reduce((a, b) => a + b, "")

  // 아웃풋의 address, amount를 계속 합쳐준다.
  const txOutContent = tx.txOuts
    .map(txOut => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, "")

  // 트랜잭션 데이터를 해시한 값 = txid
  return CryptoJS.SHA256(txInContent + txOutContent).toString()
}

// utxo를 갖고 있는지 체크
const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
  return uTxOutList.find(uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex)
}

const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
  // 인풋은 여러개가 있을 수 있다. 그중에서 사용할 input을 input index를 사용해 선택
  const txIn = tx.txIns[txInIndex]
  const dataToSign = tx.id
  const referenceduTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList)
  if (referenceduTxOut === null) {
    // no money
    return
  }
  // 사용하려는 주소의 주인이 "나"인지 체크
  const referencedAddress = referenceduTxOut.address
  if (getPublicKey(privateKey) !== referencedAddress) {
    return false
  }
  const key = ec.keyFromPrivate(privateKey, "hex")
  const signature = utils.toHexString(key.sign(dataToSign).toDER())
  return signature
}

const getPublicKey = privateKey => {
  return ec
    .keyFromPrivate(privateKey, "hex")
    .getPublic()
    .encode("hex")
}

// 이 블록체인이 갖고있는 UTxOutList, 위에 선언된 uTxOuts와 같은것
const updateUTxOuts = (newTxs, UTxOutList) => {
  // 새로운 txs의 outs를 utxos 리스트로 만든다.
  const newUTxOuts = newTxs
    .map(tx => {
      tx.txOuts.map((txOut, index) => {
        new UTxOut(tx.id, index, txOut.address, txOut.amount)
      })
    })
    .reduce((a, b) => a.concat(b), [])

  // 이미 사용된 utxo를 비운다.
  // 50 -> 10, 40 으로 보내려고 할때,
  // 50에 대한 정보를 지우는 중
  // 새로운 txs의 ins를 list로
  const spentTxOuts = newTxs
    .map(tx => tx.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map(txIn => new UTxOut(txIn.txOutId, txIn.txOutIndex, "", 0))

  // 전체 utxo 리스트 중에서 이미 사용한 spentTxOuts를 제거
  const resultingUTxOuts = uTxOutList
    .filter(uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spentTxOuts))
    .concat(newUTxOuts)

  return resultingUTxOuts
}

const isTxInStructureValid = txIn => {
  if (txIn === null) {
    console.log("The txIn appears to be null")
    return false
  } else if (typeof txIn.signature !== "string") {
    console.log("The txIn doesn't have a valid signature")
    return false
  } else if (typeof txIn.txOutId !== "string") {
    console.log("The txIn doesn't have a valid txOutId")
    return false
  } else if (typeof txIn.txOutIndex !== "number") {
    console.log("The txIn doesn't have a valid txOutIndex")
    return false
  } else {
    return true
  }
}

const isAddressValid = address => {
  if (address.length !== 130) {
    console.log("The address length is not the expected one")
    return false
  } else if (address.match("^[a-fA-F0-9]+$") === null) {
    console.log("The address doesn't match the hex patter")
    return false
  } else if (!address.startsWith("04")) {
    console.log("The address doesn't start with 04")
    return false
  } else {
    return true
  }
}

const isTxOutStructureValid = txOut => {
  if (txOut === null) {
    return false
  } else if (typeof txOut.address !== "string") {
    console.log("The txOut doesn't have a valid string as address")
    return false
  } else if (!isAddressValid(txOut.address)) {
    console.log("The txOut doesn't have a valid address")
    return false
  } else if (typeof txOut.amount !== "number") {
    console.log("The txOut doesn't have a valid amount")
    return false
  } else {
    return true
  }
}
// class Transaction {
// id
// txIns[]
// txOuts []
// }
// 트랜잭션 구조 valid check
const isTxStructureValid = tx => {
  if (typeof tx.id !== "string") {
    console.log("Tx Id is not valid")
    return false
  } else if (!(tx.txIns instanceof Array)) {
    console.log("the txins are not an array")
    return false
  } else if (!tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)) {
    console.log("the structure of one of the txIn is not valid")
    return false
  } else if (!(tx.txOuts instanceof Array)) {
    console.log("the txOuts are not an array")
    return false
  } else if (!tx.txOuts.map(isTxOutStructureValid).reduce((a, b) => a && b, true)) {
    console.log("the structure of one of the txOut is not valid")
    return false
  } else {
    return true
  }
}

const validateTxIn = (txIn, tx, uTxOutList) => {
  const wantedTxOut = uTxOutList.find(
    uTxOut => uTxOut.txOutId == txIn.txOutId && uTxOut.txOutIndex === txIn.txOutIndex
  )
  if (wantedTxOut === null) {
    return false
  } else {
    const address = wantedTxOut.address
    const key = ec.keyFromPublic(address, "hex")
    return key.verify(tx.id, txIn.signature)
  }
}

const getAmountInTxIn = (txIn, uTxOutList) => findUTxOut(txIn.id, txIn.index, uTxOutList).amount

const validateTx = (tx, uTxOutList) => {
  if (!isTxStructureValid(tx)) {
    return false
  }
  if (getTxId(tx) !== tx.id) {
    return false
  }

  const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, uTxOutList))

  if (!hasValidTxIns) {
    return false
  }

  const amountInTxIns = tx.txIns
    .map(txIn => getAmountInTxIn(txIn, uTxOutList))
    .reduce((a, b) => a + b, 0)

  const amountInTxOuts = tx.txOuts.map(txOut => txOut.amount).reduce((a, b) => a + b, 0)

  if (amountInTxIns !== amountInTxOuts) {
    return false
  } else {
    return true
  }
}

// coinbase validate (블록보상으로 마이너에게 가는것)
const validateCoinBaseTx = (tx, blockIndex) => {
  if (getTxId(tx) !== tx.id) {
    return false
  } else if (tx.txIns.length !== 1) {
    // 코인베이스 트랜잭션은 1개뿐 - 블록체인에서 오는 것
    return false
  } else if (tx.txIns[0].txOutIndex !== blockIndex) {
    // 코인베이스 트랜잭션은 참조할 utxo가 없기때문에, txOutIndex를 블록인덱스로 참조한다.
    return false
  } else if (tx.txOuts.length !== 1) {
    // 아웃풋은 채굴자에게. 채굴자는 1명
    return false
  } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    return false
  } else {
    return true
  }
}

const createCoinbaseTx = (address, blockIndex) => {
  const tx = new Transaction()
  const txIn = new TxIn()
  txIn.signature = ""
  txIn.txOutId = blockIndex
  tx.txIns = [txIn]
  tx.txOuts = [new TxOut(address, COINBASE_AMOUNT)]
  tx.id = getTxId(tx)
  return tx
}

module.exports = {
  getPublicKey,
  getTxId,
  signTxIn,
  TxIn,
  TxOut,
  Transaction,
  createCoinbaseTx
}
