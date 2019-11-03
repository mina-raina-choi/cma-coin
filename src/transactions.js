const CryptoJS = require("crypto-js"),
  EC = require("elliptic").ec,
  utils = require("./utils"),
  _ = require("lodash")

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
    .map(txIn => txIn.txOutId + txIn.txOutIndex)
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
  const ret = uTxOutList.find(
    uTxOut => uTxOut.txOutId === txOutId && uTxOut.txOutIndex === txOutIndex
  )

  return ret
}

const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
  // 인풋은 여러개가 있을 수 있다. 그중에서 사용할 input을 input index를 사용해 선택
  const txIn = tx.txIns[txInIndex]
  const dataToSign = tx.id
  const referencedUTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList)
  if (referencedUTxOut === null || referencedUTxOut === undefined) {
    // no money
    throw Error("Couldn't find the referenced uTxOut, not signing")
    return
  }
  // 사용하려는 주소의 주인이 "나"인지 체크
  const referencedAddress = referencedUTxOut.address
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
const updateUTxOuts = (newTxs, uTxOutList) => {
  // 새로운 txs의 outs를 utxos 리스트로 만든다.
  const newUTxOuts = newTxs
    .map(tx => {
      return tx.txOuts.map((txOut, index) => {
        return new UTxOut(tx.id, index, txOut.address, txOut.amount)
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
    uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
  )

  if (wantedTxOut === null) {
    console.log(`Didn't find the wanted uTxOut, the tx: ${tx} is invalid`)
    return false
  } else {
    const address = wantedTxOut.address
    const key = ec.keyFromPublic(address, "hex")
    return key.verify(tx.id, txIn.signature)
  }
}

// txIn의 객체형태 id, index
const getAmountInTxIn = (txIn, uTxOutList) =>
  findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount

const validateTx = (tx, uTxOutList) => {
  if (!isTxStructureValid(tx)) {
    return false
  }
  if (getTxId(tx) !== tx.id) {
    return false
  }

  const hasValidTxIns = tx.txIns.map(txIn => validateTxIn(txIn, tx, uTxOutList))

  if (!hasValidTxIns) {
    console.log(`The tx: ${tx} doesn't have valid txIns`)
    return false
  }

  const amountInTxIns = tx.txIns
    .map(txIn => {
      return getAmountInTxIn(txIn, uTxOutList)
    })
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
    console.log("Invalid Coinbase tx ID")
    return false
  } else if (tx.txIns.length !== 1) {
    // 코인베이스 트랜잭션은 1개뿐 - 블록체인에서 오는 것
    console.log("Coinbase TX should only have one input")

    return false
  } else if (tx.txIns[0].txOutIndex !== blockIndex) {
    console.log("The txOutIndex of the Coinbase Tx should be the same as the Block Index")
    // 코인베이스 트랜잭션은 참조할 utxo가 없기때문에, txOutIndex를 블록인덱스로 참조한다.
    return false
  } else if (tx.txOuts.length !== 1) {
    // 아웃풋은 채굴자에게. 채굴자는 1명
    console.log("Coinbase TX should only have one output")

    return false
  } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    console.log(
      `Coinbase TX should have an amount of only ${COINBASE_AMOUNT} and it has ${tx.txOuts[0].amount}`
    )
    return false
  } else {
    return true
  }
}

const createCoinbaseTx = (address, blockIndex) => {
  const tx = new Transaction()
  const txIn = new TxIn()
  txIn.signature = ""
  txIn.txOutId = ""
  txIn.txOutIndex = blockIndex
  tx.txIns = [txIn]
  tx.txOuts = [new TxOut(address, COINBASE_AMOUNT)]
  tx.id = getTxId(tx)
  return tx
}

// double spending을 막기위해
const hasDuplicates = txIns => {
  // txid + vout을 그룹핑
  const groups = _.countBy(txIns, txIn => txIn.txOutId + txIn.txOutIndex)
  return (
    _(groups)
      .map(value => {
        if (value > 1) {
          // duplicate!!
          console.log("Found a duplicated txIn")
          return true
        } else {
          return false
        }
      })
      // [true, false, true, ....]
      .includes(true)
  )
}

const validateBlockTx = (txs, uTxOutList, blockIndex) => {
  const coinbaseTx = txs[0]
  if (!validateCoinBaseTx(coinbaseTx, blockIndex)) {
    console.log("Coinbase Tx is invalid")
    return false
  }

  const txIns = _(txs)
    .map(tx => tx.txIns)
    .flatten()
    .value()

  // check if the txIns are duplicated
  if (hasDuplicates(txIns)) {
    console.log("Found duplicated txIns")
    return false
  }

  // 배열의 첫번째값 제외한 배열
  const nonCoinbaseTxs = txs.slice(1)
  return nonCoinbaseTxs.map(tx => validateTx(tx, uTxOutList)).reduce((a, b) => a && b, true)
}

const processTxs = (txs, uTxOutList, blockIndex) => {
  if (!validateBlockTx(txs, uTxOutList, blockIndex)) {
    return null
  }
  return updateUTxOuts(txs, uTxOutList)
}

module.exports = {
  getPublicKey,
  getTxId,
  signTxIn,
  TxIn,
  TxOut,
  Transaction,
  createCoinbaseTx,
  processTxs,
  validateTx
}
