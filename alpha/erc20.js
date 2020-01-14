const request = require('request')
const fs = require('fs');

const Network = require("@maticnetwork/meta/network")
const Matic = require("maticjs").default
const config = require('../config.json')

const network = new Network(config.network, config.version)
const MaticNetwork = network.Matic 
const MainNetwork = network.Main 

const ChildTokenAddress = config.ChildTokenAddress ||  MaticNetwork.Contracts.ChildTestToken
const RootTokenAddress = config.RootTokenAddress || MainNetwork.Contracts.TestToken

// console.log(MaticNetwork)

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

function PromiseTimeout(delayms) {
    return new Promise(function(resolve, reject) {
      setTimeout(resolve, delayms)
    })
}

function init () {
    matic.wallet = config.privateKey1
    matic.wallet = config.privateKey2

    childWeb3 = matic.web3
    rootWeb3 = matic.parentWeb3

    wallet = childWeb3.eth.accounts.wallet

    acc1 = wallet[0].address
    acc2 = wallet[1].address

    amount = config.value || 1

    console.log('connected to, ')
    console.log(
        ' root provider', rootWeb3.currentProvider.host, '\n',
        'child provider', childWeb3.currentProvider.host, '\n'
    )

    console.log('added accounts to wallet, ')
    console.log (
        ' acc1', acc1, '\n', 'acc2', acc2, '\n'
    )
    console.log('tokens addded,')
    console.log (
        ' root', RootTokenAddress, '\n', 'child', ChildTokenAddress, '\n'
    )
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

async function testDeposit(token, account) {
    await matic.approveERC20TokensForDeposit(token, amount, {
        from: account
    }).then((r) => {
        console.log ('approval successful, tx hash:', r.transactionHash)
    })
    await matic.depositERC20Tokens(token, account, amount, {
        from: account
    }).then((r) => console.log ('tokens deposited to root chain, tx hash:', r.transactionHash))
}

async function testTransfer(acc1, acc2, token) {
    await matic.transferTokens(token, acc2, amount, {
        from: acc1
    }).then((r) => console.log('transfer successful, tx hash:', r.transactionHash))
}

async function startWithdraw(account, token) {
    await matic.startWithdraw(token, amount, 
        {from: account}
    ).then((r) => {
        hash = r.transactionHash
        console.log('initiated withdraw, ', hash)
    })
    return hash
}

async function getProofOfBurn(hash) {
    let url = MaticNetwork.SyncerAPI + '/tx/' + hash

    await request(url, { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
    }).pipe(fs.createWriteStream('transactionBlock.json'))
}

let balances
async function test() {
    init()
    await displayBalances()
    
    // deposit tokens on matic chain
    await testDeposit(RootTokenAddress, acc1)

    // wait 7 sec
    await PromiseTimeout (7000)

    await displayBalances()

    // test transfer on matic
    await testTransfer(acc1, acc2, ChildTokenAddress)

    await displayBalances()

    // burn on child
    const hash = await startWithdraw(acc2, ChildTokenAddress)

    // wait 10 sec
    await PromiseTimeout(10000)

    await getProofOfBurn(hash)

    await displayBalances()

    console.log('\nrun `complete-withdraw` to check status of checkpoint submission, if successful, the script will run further necessary steps and will display the updated balances.')

}
test()