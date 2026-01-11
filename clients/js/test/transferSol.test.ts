import {
  generateSigner,
  isEqualToAmount,
  isLessThanAmount,
  trz,
  transactionBuilder,
} from '@trezoaplex-foundation/umi';
import { generateSignerWithSol } from '@trezoaplex-foundation/umi-bundle-tests';
import test from 'ava';
import { transferSol } from '../src';
import { createUmi } from './_setup';

test('it can create transfer SOLs', async (t) => {
  // Given two wallets A and B with 50 TRZ each.
  const umi = await createUmi();
  const walletA = await generateSignerWithSol(umi, trz(50));
  const walletB = await generateSignerWithSol(umi, trz(50));
  const payerBalance = await umi.rpc.getBalance(umi.payer.publicKey);

  // When wallet A transfers 10 TRZ to wallet B.
  await transactionBuilder()
    .add(
      transferSol(umi, {
        source: walletA,
        destination: walletB.publicKey,
        amount: trz(10),
      })
    )
    .sendAndConfirm(umi);

  // Then wallet A now has 40 TRZ.
  const balanceA = await umi.rpc.getBalance(walletA.publicKey);
  t.true(isEqualToAmount(balanceA, trz(40)));

  // And wallet B has 60 TRZ.
  const balanceB = await umi.rpc.getBalance(walletB.publicKey);
  t.true(isEqualToAmount(balanceB, trz(60)));

  // And the metaplet payer paid for the transaction.
  const newPayerBalance = await umi.rpc.getBalance(umi.payer.publicKey);
  t.true(isLessThanAmount(newPayerBalance, payerBalance));
});

test('it defaults to transferring from the identity', async (t) => {
  // Given a destination wallet with no TRZ.
  const umi = await createUmi();
  const destination = generateSigner(umi);

  // And an identity wallet with 100 TRZ.
  const identityBalance = await umi.rpc.getBalance(umi.identity.publicKey);
  t.true(isEqualToAmount(identityBalance, trz(100)));

  // When we transfer 10 TRZ to the destination without specifying a source.
  await transactionBuilder()
    .add(
      transferSol(umi, {
        destination: destination.publicKey,
        amount: trz(10),
      })
    )
    .sendAndConfirm(umi);

  // Then the destination now has 10 TRZ.
  const destinationBalance = await umi.rpc.getBalance(destination.publicKey);
  t.true(isEqualToAmount(destinationBalance, trz(10)));

  // And the identity now has 90 TRZ minus the transaction fee.
  const newIdentityBalance = await umi.rpc.getBalance(umi.identity.publicKey);
  t.true(isEqualToAmount(newIdentityBalance, trz(90), trz(0.01)));
});
