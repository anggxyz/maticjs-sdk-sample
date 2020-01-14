const transaction = require ('./transactionBlock.json')
const request = require('request')
const config = require('./config')

const Network = require("@maticnetwork/meta/network")
const Matic = require("maticjs").default
const config = require('../config.json')

const network = new Network(config.network, config.version)
const MaticNetwork = network.Matic 
const MainNetwork = network.Main 

const ChildTokenAddress = config.ChildTokenAddress ||  MaticNetwork.Contracts.ChildTestToken
const RootTokenAddress = config.RootTokenAddress || MainNetwork.Contracts.TestToken

const matic = new Matic({
    maticProvider: MaticNetwork.RPC,
    parentProvider: MainNetwork.RPC,
    rootChainAddress: MainNetwork.Contracts.RootChain,
    syncerUrl: MaticNetwork.SyncerAPI,
    watcherUrl: MainNetwork.WatcherAPI,
    withdrawManagerAddress: MainNetwork.Contracts.WithdrawManager,
    depositManagerAddress: MainNetwork.Contracts.DepositManager
})

let childWeb3, rootWeb3, wallet, acc1, acc2, amount

matic.wallet = config.privateKey1
matic.wallet = config.privateKey2

childWeb3 = matic.web3
rootWeb3 = matic.parentWeb3

wallet = childWeb3.eth.accounts.wallet

acc1 = wallet[0].address
acc2 = wallet[1].address

amount = config.value || 1


function PromiseTimeout(delayms) {
    return new Promise(function(resolve, reject) {
      setTimeout(resolve, delayms)
    })
}

async function getBalances (root,child, acc1, acc2) {
    let result = {}

    let rootAcc1 = await matic.balanceOfERC20(acc1, root, { parent: true })
    let rootAcc2 = await matic.balanceOfERC20(acc2, root, { parent: true })

    let childAcc1 = await matic.balanceOfERC20(acc1, child)
    let childAcc2 = await matic.balanceOfERC20(acc2, child)

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
    balances = await getBalances(RootTokenAddress, ChildTokenAddress, acc1, acc2)
    
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
    await checkInclusion()
    await matic.withdraw (transaction.txId, { from: acc2 }).then((r) => console.log(r.transactionHash)) 

    console.log('\nwaiting ~5 sec to execute process-exit for the token')
    await PromiseTimeout(5000)
    
    await matic.processExits(RootTokenAddress, { from: acc1 }).then((r) => console.log('process exit completed,', r.transactionHash))
    
    await PromiseTimeout(5000)

    displayBalances()
}

completeWithdraw()