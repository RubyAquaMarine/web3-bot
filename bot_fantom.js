const Web3 = require('web3');
const routerABI = require('./abi/spooky_router.json');
const credentials = require('./config/config.json');

const web3 = new Web3(new Web3.providers.HttpProvider(credentials.rpc.fantom));

const privateKey = credentials.account.privateKey;

const activeAccount = web3.eth.accounts.privateKeyToAccount(privateKey);

const timerSpeed = credentials.tools.m1;

const routerAddress = credentials.spookyswap.router;

const routerContract = new web3.eth.Contract(routerABI, routerAddress);

const fromToken = credentials.swap.fromAddress;

const toToken = credentials.swap.toAddress;

const expiryDate = Math.floor(Date.now() / 1000) + 1500;

async function doStuff() {

    var originalAmount = credentials.swap.amount;

    var weiAmount = await web3.utils.toWei(originalAmount, 'ether');

    const price_try = await routerContract.methods.getAmountsOut(weiAmount, [fromToken, toToken]).call();

    const amountOut = price_try[1];

    
    console.log("AmountsINN: ", weiAmount);
    console.log("AmountsOUT: ", amountOut);

    
    console.log("AmountsINN_: ", web3.utils.fromWei(weiAmount));
    console.log("AmountsOUT_: ", web3.utils.fromWei(amountOut));



    //const quote = await routerContract.methods.quote(qty, fromToken, toToken).call();

    var swap_tx = '';
    if (credentials.swap.type == 'A') {
        var amountOutMin = '100' + Math.random().toString().slice(2, 6);
        swap_tx = await routerContract.methods.swapExactETHForTokens(web3.utils.toHex(amountOutMin), [fromToken, toToken], activeAccount.address, expiryDate);
    }

    if (credentials.swap.type == 'B') {
        swap_tx = await routerContract.methods.swapExactTokensForETH(weiAmount, 0, [fromToken, toToken], activeAccount.address, expiryDate);
    }

    if (credentials.swap.type == 'C') {
        const path = [fromToken, toToken]
        swap_tx = await routerContract.methods.swapExactTokensForTokens(weiAmount, 0, path, activeAccount.address, expiryDate);
    }

    let encoded_tx = swap_tx.encodeABI();

   // const transactionNonce = await web3.eth.getTransactionCount(activeAccount.address, 'pending');
   // console.log(`NONCE: `, transactionNonce);

    const gas_try = await web3.eth.getGasPrice();
   // console.log(`GAS PRICE: `, gas_try);


   /*
   type C
    debugging 
    gasPrice: 21105880000 - error "transaction underpriced"
    gasPrice: 211058800000 - error "insufficient funds for gas + price + value"

    notes- 
    - value: TokenAmount OR ETH toWei
   */

    let transactionObject = {
        gasPrice: gas_try,
        gas: 280000,
        data: encoded_tx,
        from: activeAccount.address,
        to: routerAddress,
        value: weiAmount
    };

    const signedTX = await web3.eth.accounts.signTransaction(transactionObject, activeAccount.privateKey, (error, signedTx) => {
        console.log('Any Error: ', error);
        console.log('Signed: ', signedTx.rawTransaction);
        return signedTx;
    });



    await web3.eth.sendSignedTransaction(
        signedTX.rawTransaction
     //   , 
     //    async (err,data) =>{
     //        if(err){
      //           console.log('sendSignedTransaction error',err)
      //       }
      //   }

    ).on('receipt', receipt => console.log('END:\n\n: ', receipt));
};


function run() {
    console.log("Bot is running... after timerSpeed expires, the bot will perform an action");
    setInterval(doStuff, timerSpeed);
};

run();

