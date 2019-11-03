const WebSockets = require("ws"),
  Blockchain = require("./blockchain")

const {
  getNewestBlock,
  isBlockStructureValid,
  addBlockToChain,
  replaceChain,
  getBlockchain
} = Blockchain

const sockets = []

const getSockets = () => sockets

// 새로운 피어가 연결되었을 때,
// 1. 새로운 피어로부터 최근 블록을 요청 => 만약 1블록이 아니라 많이 뒤쳐져있으면 2번을 요청해서 replace한다
// 2. 새로운 피어로부터 모든 블록체인을 요청 - 교체해야할 수가 있으니까
// 3. blocks를 가져와야함
//  => 응답을 처리하는 방법을 알아야함.
// 리덕스와 같은 작업.
// Message Types
const GET_LATEST = "GET_LATEST"
const GET_ALL = "GET_ALL"
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE"

// Message Creators
const getLatest = () => {
  return {
    type: GET_LATEST,
    data: null
  }
}

const getAll = () => {
  return {
    type: GET_ALL,
    data: null
  }
}

const blockchainResponse = data => {
  return {
    type: BLOCKCHAIN_RESPONSE,
    data: data
  }
}

const startP2PServer = server => {
  const wsServer = new WebSockets.Server({ server })
  wsServer.on("connection", ws => {
    //   ws는 내 서버에 접속된 웹소켓을 의미함
    console.log(`Hello ${"Socket"}`)
    initSocketConnection(ws)
  })
  console.log(`cma-coin P2P Server running!!`)
}

const initSocketConnection = ws => {
  sockets.push(ws)
  handleSocketMessages(ws)
  handleSocketError(ws)
  // 너가 나에게 접속을 하면, 자동으로 나의 최근블록을 가져가도록
  sendMessage(ws, getLatest())
  //   ws.on("message", data => {
  //     console.log(data);
  //   });
  //   setTimeout(() => {
  //     socket.send("welcome");
  //   }, 5000);
}

const handleSocketMessages = ws => {
  ws.on("message", data => {
    const message = parseData(data)
    if (message === null) {
      return
    }
    console.log("handleSocketMessages", message)
    switch (message.type) {
      // 최근 블록을 얻고 싶으면 GET_LATEST보낸다
      // GET_LATEST 메시지를 받으면 연결된 소켓에 message를 send
      case GET_LATEST:
        sendMessage(ws, responseLatest())
        break
      case GET_ALL:
        sendMessage(ws, responseAll())
        break
      case BLOCKCHAIN_RESPONSE:
        // handle response
        // 받은 블록이 우리보다 앞서있는지 체크 후  1. 블록추가, 2. 교체
        // 우리가 앞서있으면 그대로 두면 된다.
        const receivedBlocks = message.data
        if (receivedBlocks === null) {
          break
        }
        handleBlockchainResponse(receivedBlocks)
        break
    }
  })
}

const parseData = data => {
  try {
    return JSON.parse(data)
  } catch (e) {
    console.log(e)
    return null
  }
}

// message 보낼 ws과 message내용
const sendMessage = (ws, message) => ws.send(JSON.stringify(message))

const sendMessageToAll = message => sockets.forEach(ws => sendMessage(ws, message))

const responseLatest = () => blockchainResponse([getNewestBlock()])

const responseAll = () => blockchainResponse(getBlockchain())

// socket 연결 끊어지거나 에러 발생시 close
const handleSocketError = ws => {
  const closeSocketConnection = ws => {
    ws.close()
    sockets.splice(sockets.indexOf(ws), 1)
  }
  ws.on("close", () => closeSocketConnection(ws))
  ws.on("error", () => closeSocketConnection(ws))
}

const handleBlockchainResponse = receivedBlocks => {
  // empty
  if (receivedBlocks.length === 0) {
    console.log("received blocks have a length of 0")
    return
  }

  // 왜 마지막 블록만 구조체크 하지?
  // 다른 피어에서 addBlockToChain할 때 유효성 검증을 다하기 때문?
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1]
  if (!isBlockStructureValid(latestBlockReceived)) {
    console.log("latestBlockReceived", latestBlockReceived)
    //  매우 중요!!!! 블록구조를 체크하지 않으면 누군가 다른 코인을 가지는 블록체인을 별도로 만들어서 더 길게 만들어서
    // 보내면 잘못된 교체를 할수도 있다.
    console.log("The block structure of the block received is not valid")
    return
  }

  const newestBlock = getNewestBlock()
  if (latestBlockReceived.index > newestBlock.index) {
    //   ahead
    if (newestBlock.hash === latestBlockReceived.prevHash) {
      // 1 block ahead
      if (addBlockToChain(latestBlockReceived)) {
        //  체인에 블록이 잘 연결됐다면
        broadcastNewBlock()
      }
    } else if (receivedBlocks.length === 1) {
      // to do, get all the blocks, we are way behind
      //   모두에게 블록을 달라고 요청, 소켓에 다 요청
      console.log("req get all")
      sendMessageToAll(getAll())
    } else {
      // replace chain
      replaceChain(receivedBlocks)
      console.log("replace chain")
    }
  } else {
    console.log("앞서있음")
  }
}

// 연결된 모든 소켓에 나의 최신블록을 알림
const broadcastNewBlock = () => sendMessageToAll(responseLatest())

// newPeer is URL that websocket is running on
const connectToPeers = newPeer => {
  const ws = new WebSockets(newPeer)
  ws.on("open", () => {
    console.log(`open Socket`)
    initSocketConnection(ws)
  })
}

module.exports = {
  startP2PServer,
  connectToPeers,
  broadcastNewBlock
}
