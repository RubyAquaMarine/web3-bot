const { getAddress } = require('@ethersproject/address');
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

    const amountOut = price_try[1].sub(price_try[1].div(10));// 10% slippage

    let try_string = gas_try.toString();

    console.log("AmountsINN: ", weiAmount.toString());
    console.log("AmountsOUT: ", amountOut.toString());

    var swap_tx = '';

    if (credentials.swap.type == 'C') {
        swap_tx = await routerContract.swapExactTokensForTokens(
            weiAmount,// amountIn
            amountOut,// amountOutIn
            [fromToken, toToken],
            publicKey,
            expiryDate,
            // these value are BigNumbers. maybe thats the issue 
            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce
            }

        ).then(result => {

            //  console.log("Processing Result: ", result);
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });

        }).catch(err => {
            console.log("Processing Error: ", err);
        });
    }

    if (credentials.swap.type == 'D') {
        swap_tx = await routerContract.swapTokensForExactTokens(
            amountOut,// amountOut
            weiAmount,// amountInMax
            [fromToken, toToken],
            publicKey,
            expiryDate,
            // these value are BigNumbers. maybe thats the issue 
            {
                "gasPrice": try_string,
                "gasLimit": "280000",
                "nonce": nonce
            }

        ).then(result => {

            //  console.log("Processing Result: ", result);
            let out = result.wait().then(ok => {
                console.log("Result: ", ok);
            }).catch(err => {
                console.log("Result Error: ", err);
            });

        }).catch(err => {
            console.log("Processing Error: ", err);
        });
    }

};


function run() {
    console.log("Bot is running... after timerSpeed expires, the bot will perform an action");
    setInterval(doStuff, timerSpeed);
};

run();

