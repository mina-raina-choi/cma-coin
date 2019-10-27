const CryptoJS = require("crypto-js"),
  EC = require("elliptic").ec
utils = require("./utils")

const ec = new EC("secp256k1")

class TxOut {
  constructor(address, amount) {
    this.address = address
    this.amount = amount
  }
}

// utxo : 아직 사용하지 않은 아웃풋
class TxIn {
  // uTxOutId
  // uTxOutIndex
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

const signTxIn = (tx, txInIndex, privateKey, uTxOut) => {
  // 인풋은 여러개가 있을 수 있다. 그중에서 사용할 input을 input index를 사용해 선택
  const txIn = tx.txIns[txInIndex]
  const dataToSign = tx.id
  const referenceduTxOut = findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOuts)
  if (referenceduTxOut === null) {
    // no money
    return
  }
  // todo Sign the Txin
  const key = ec.keyFromPrivate(privateKey, "hex")
  const signature = utils.toHexString(key.sign(dataToSign).toDER())
  return signature
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
    return false
  } else if (typeof txIn.signature !== "string") {
    return false
  } else if (typeof txIn.txOutId !== "string") {
    return false
  } else if (typeof txIn.txOutIndex !== "number") {
    return false
  } else {
    return true
  }
}

const isAddressValid = address => {
  if (address.length !== 130) {
    return false
  } else if (address.match("^[0-9a-fA-F]+$") === null) {
    return false
  } else if (!address.startWith("04")) {
    return false
  } else {
    return true
  }
}

const isTxOutStructureValid = txOut => {
  if (txOut === null) {
    return false
  } else if (typeof txOut.address !== "string") {
    return false
  } else if (typeof txOut.amount !== "number") {
    return false
  } else if (!isAddressValid(txOut.address)) {
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
  } else if (isTxInStructureValid) {
    console.log("the structure of one of the txIn is not valid")
    return false
  } else if (!(tx.txOuts instanceof Array)) {
    console.log("the txOuts are not an array")
    return false
  } else if (isTxOutStructureValid) {
    console.log("the structure of one of the txOut is not valid")
    return false
  } else {
    return true
  }
}
