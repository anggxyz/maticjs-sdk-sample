const transaction = require ('./transactionBlock.json')
const request = require('request')
const config = require('../config')

const Network = require("@maticnetwork/meta/network")
const Matic = require("@maticnetwork/maticjs").default

const network = new Network(config.network, config.version)
const MaticNetwork = network.Matic 
const MainNetwork = network.Main 

const ChildTokenAddress = config.ChildTokenAddress ||  MaticNetwork.Contracts.Tokens.TestToken
const RootTokenAddress = config.RootTokenAddress || MainNetwork.Contracts.Tokens.TestToken

const ChildTokenABI = network.abi("ChildERC20")
const RootTokenABI = network.abi("ChildERC20")

const matic = new Matic({
    maticProvider: MaticNetwork.RPC,
    parentProvider: MainNetwork.RPC,
    rootChain: MainNetwork.Contracts.RootChain,
    withdrawManager: MainNetwork.Contracts.WithdrawManager,
    depositManager: MainNetwork.Contracts.DepositManager,
    registry: MainNetwork.Contracts.Registry
})

let childWeb3, rootWeb3, acc1, acc2, amount
let ChildTokenContract, RootTokenContract


async function init () {
    await matic.initialize()
    await matic.setWallet(config.privateKey1)
    await matic.setWallet(config.privateKey2)

    childWeb3 = matic.web3Client.getMaticWeb3()
    rootWeb3 = matic.web3Client.getParentWeb3()

    acc1 = childWeb3.eth.accounts.wallet[0].address
    acc2 = childWeb3.eth.accounts.wallet[1].address

    amount = config.value || 1

    await initContracts()
}

async function initContracts () {
    ChildTokenContract = new childWeb3.eth.Contract(ChildTokenABI, ChildTokenAddress)
    
    RootTokenContract = new rootWeb3.eth.Contract(RootTokenABI, RootTokenAddress)
}


function PromiseTimeout(delayms) {
    return new Promise(function(resolve, reject) {
      setTimeout(resolve, delayms)
    })
}

async function getBalances (root,child, acc1, acc2) {
    let result = {}

    let rootAcc1 = await root.methods.balanceOf(acc1).call()

    let rootAcc2 = await root.methods.balanceOf(acc2).call()

    let childAcc1 = await child.methods.balanceOf(acc1).call()

    let childAcc2 = await child.methods.balanceOf(acc2).call()

    result = {
        'parent': {
            'acc1': childWeb3.utils.fromWei(rootAcc1, 'ether'),
            'acc2': childWeb3.utils.fromWei(rootAcc2, 'ether')
        },
        'child': {
            'acc1': childWeb3.utils.fromWei(childAcc1, 'ether'),
            'acc2': childWeb3.utils.fromWei(childAcc2,'ether')
        }
    }

    return result;
}

async function displayBalances() {
    console.log('\nbalances:')
    balances = await getBalances(RootTokenContract, ChildTokenContract, acc1, acc2)
    
    console.log(
        ' parent, acc1\t', balances.parent.acc1, '\n',
        'parent, acc2\t', balances.parent.acc2, '\n',
        'child, acc1\t', balances.child.acc1, '\n',
        'child, acc2\t', balances.child.acc2, '\n'
    )
}

async function checkInclusion() {
    await request (url, { json: true }, (err, res, body) => {
        if (body.error) { 
            console.log('tx hasnt been included in a checkpoint, try again later.\n(check `https://status.matic.today` for the last checkpoint submission timestamp)'); 
            process.exit();
        }
        else {
            console.log('tx included! completing withdrawal process now ...')
        }
    })
}

async function completeWithdraw() {
    await init()
    await checkInclusion()
    await matic.withdraw (transaction.txId, { from: acc2 }).then((r) => console.log(r.transactionHash)) 

    console.log('\nwaiting ~5 sec to execute process-exit for the token')
    await PromiseTimeout(5000)
    
    await matic.processExits(RootTokenAddress, { from: acc1 }).then((r) => console.log('process exit completed,', r.transactionHash))
    
    await PromiseTimeout(5000)

    displayBalances()
}

completeWithdraw()