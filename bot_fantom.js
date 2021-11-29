const { getAddress } = require('@ethersproject/address');
const { default: BigNumber } = require('bignumber.js');
const ethers = require('ethers');
const routerABI = require('./abi/spooky_router.json');
const credentials = require('./config/config.json');

const provider = new ethers.providers.JsonRpcProvider(credentials.rpc.fantom);

const privateKey = credentials.account.privateKey;

const publicKey = credentials.account.publicKey;

const wallet = new ethers.Wallet(privateKey);
// creates the Signer abstract class => into the Signer client
// using one of the following  Wallet, VoidSigner, JsonRpcSigner
const account = wallet.connect(provider);

const timerSpeed = credentials.tools.m1;

const routerContract = new ethers.Contract(credentials.spookyswap.router, routerABI, account);

const fromToken = credentials.swap.fromAddress;

const toToken = credentials.swap.toAddress;

const expiryDate = Math.floor(Date.now() / 1000) + 15000;

async function doStuff() {

    //Provider 
    const block = await provider.getBlockNumber();

    const balance = await provider.getBalance(publicKey);

    const gas_try = await provider.getGasPrice();
   
    console.log(" Block: " + block + " Balance: " + balance + " GasPrice: " + gas_try.toString());

    //Signer 
    const address = await account.getAddress();

    const nonce = await account.getTransactionCount("latest");

    console.log(" My Wallet Address: " + address + " TransactionCount: " + nonce); 

    const originalAmount = credentials.swap.amount;

    const weiAmount = ethers.utils.parseUnits(originalAmount, 'ether');

    const price_try = await routerContract.getAmountsOut(weiAmount, [fromToken, toToken]);

    const amountOut = price_try[1].sub(price_try[1].div(10));


        let try_string = gas_try.toString();

    console.log("AmountsINN: ", weiAmount.toString() );
    console.log("AmountsOUT: ", amountOut.toString() );

    //const quote = await routerContract.methods.quote(qty, fromToken, toToken).call();
    
    var swap_tx = '';

    if (credentials.swap.type == 'A') {
        swap_tx = await routerContract.swapExactTokensForTokens(
            weiAmount, 
            amountOut,
            [fromToken, toToken], 
            publicKey, 
            expiryDate,
            // these value are BigNumbers. maybe thats the issue 
            {
                "gasPrice" : try_string,
                "gasLimit" : "280000",
                "nonce" : nonce
            }
           
        ).then(result =>{
            
          //  console.log("Processing Result: ", result);
            let out = result.wait().then(ok=>{
                console.log("Result: ", ok);
            }).catch(err=>{
                console.log("Error: ", err);
            });
         
        }).catch(err=>{
            console.log("Processing Error: ", err);
        });
    }

   // const receipt = await swap_tx.wait();// oh, .wait is for typescript only? 
   // console.log("Swap Tx: ", receipt);
    /*
    if (credentials.swap.type == 'B') {
        swap_tx = await routerContract.methods.swapExactTokensForETH(weiAmount, 0, [fromToken, toToken], activeAccount.address, expiryDate);
    }

    if (credentials.swap.type == 'C') {
        const path = [fromToken, toToken]
        swap_tx = await routerContract.methods.swapExactTokensForTokens(weiAmount, 0, path, activeAccount.address, expiryDate);
    }
    */


    /*
    let encoded_tx = swap_tx.encodeABI();

    // const transactionNonce = await web3.eth.getTransactionCount(activeAccount.address, 'pending');
    // console.log(`NONCE: `, transactionNonce);

    const gas_try = await provider.getGasPrice();
    console.log(`GAS PRICE: `, gas_try);


    let transactionObject = {
        gasPrice: gas_try,
        gas: 280000,
        data: encoded_tx,
        from: publicKey,
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


    */

   // const signed = await account.signTransaction(transactionObject,)

};


function run() {
    console.log("Bot is running... after timerSpeed expires, the bot will perform an action");
    setInterval(doStuff, timerSpeed);
};

run();

