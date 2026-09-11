"use client";

import { useMemo, useState } from "react";
import type { NextPage } from "next";
import { keccak256, stringToHex } from "viem";
import { useAccount } from "wagmi";
import { CameraIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, MinusCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { QrScanner } from "~~/components/vitrine/QrScanner";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useCampaigns } from "~~/hooks/vitrine/useCampaigns";
import { CouponQrPayload, campaignDisplayName, decodeCouponQr } from "~~/utils/vitrine";

/**
 * The waiter's screen. One giant button, one camera view, one loud color-coded
 * verdict: green = honor the coupon, gray = already used, red = not a coupon.
 * No technical vocabulary anywhere — the on-chain checks happen silently.
 */

type ScanState =
  | { kind: "idle" }
  | { kind: "scanning"; cameraError?: boolean }
  // payload undefined = the QR was read but is not one of our coupons
  | { kind: "result"; payload?: CouponQrPayload };

const ResultFrame = ({
  tone,
  children,
}: {
  tone: "success" | "neutral" | "error" | "loading";
  children: React.ReactNode;
}) => {
  const border =
    tone === "success"
      ? "border-success bg-success/10"
      : tone === "error"
        ? "border-error bg-error/10"
        : tone === "neutral"
          ? "border-base-300 bg-base-300/40"
          : "border-base-300 bg-base-100";
  return (
    <div className={`w-full rounded-box border-2 ${border} p-8 flex flex-col items-center text-center gap-3`}>
      {children}
    </div>
  );
};

/** Verdict + confirmation for a successfully decoded coupon QR. */
const ScanResult = ({ payload, onReset }: { payload: CouponQrPayload; onReset: () => void }) => {
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();
  const [redeemedName, setRedeemedName] = useState<string>();

  const campaign = useMemo(() => campaigns.find(c => c.id === payload.tokenId), [campaigns, payload.tokenId]);

  const { data: balance, isLoading: balanceLoading } = useScaffoldReadContract({
    contractName: "DiscountNFT",
    functionName: "balanceOf",
    args: [payload.owner, payload.tokenId],
    watch: true,
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "DiscountNFT" });

  const scanNext = (
    <button className="btn btn-primary btn-lg w-full" onClick={onReset}>
      <CameraIcon className="h-6 w-6" />
      Escanear próximo cupom
    </button>
  );

  if (redeemedName) {
    return (
      <div className="flex flex-col gap-4 w-full items-center">
        <ResultFrame tone="success">
          <CheckCircleIcon className="h-20 w-20 text-success" />
          <p className="m-0 text-2xl font-extrabold">Chorinho validado com sucesso!</p>
          <p className="m-0 opacity-70">
            {redeemedName} — benefício confirmado na blockchain. Pode entregar o chorinho ou cortesia ao cliente.
          </p>
        </ResultFrame>
        {scanNext}
      </div>
    );
  }

  if (campaignsLoading || balanceLoading || balance === undefined) {
    return (
      <ResultFrame tone="loading">
        <span className="loading loading-spinner loading-lg" />
        <p className="m-0 opacity-70">Conferindo cupom…</p>
      </ResultFrame>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col gap-4 w-full items-center">
        <ResultFrame tone="error">
          <XCircleIcon className="h-20 w-20 text-error" />
          <p className="m-0 text-2xl font-extrabold text-error">Cupom inválido</p>
          <p className="m-0 opacity-70">Este código não corresponde a nenhuma oferta. Não aceite o desconto.</p>
        </ResultFrame>
        {scanNext}
      </div>
    );
  }

  if (balance === 0n) {
    return (
      <div className="flex flex-col gap-4 w-full items-center">
        <ResultFrame tone="neutral">
          <MinusCircleIcon className="h-20 w-20 opacity-50" />
          <p className="m-0 text-2xl font-extrabold">Este cupom já foi usado</p>
          <p className="m-0 opacity-70">
            {campaignDisplayName(campaign)} — o cliente não tem mais este cupom disponível.
          </p>
        </ResultFrame>
        {scanNext}
      </div>
    );
  }

  const handleConfirm = async () => {
    // Opaque redemption reference recorded with the burn: lets the platform
    // reconcile this redemption later without any backend today.
    const ref = keccak256(stringToHex(`${payload.owner}-${payload.tokenId}-${Date.now()}`));
    try {
      await writeContractAsync({
        functionName: "redeem",
        args: [payload.owner, payload.tokenId, 1n, ref],
      });
      setRedeemedName(campaignDisplayName(campaign));
    } catch (e) {
      // rejection/revert already surfaced as a notification by the transactor
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full items-center">
      <ResultFrame tone="success">
        <CheckCircleIcon className="h-20 w-20 text-success" />
        <p className="m-0 text-2xl font-extrabold text-success">Chorinho Válido</p>
        <p className="m-0 font-semibold text-lg">{campaignDisplayName(campaign)}</p>
        {campaign.metadata?.establishment && <p className="m-0 opacity-70">{campaign.metadata.establishment}</p>}
        {balance > 1n && (
          <span className="badge badge-neutral">cliente tem {balance.toString()} chorinhos desta oferta</span>
        )}
      </ResultFrame>
      <button
        className="btn btn-primary btn-lg w-full rounded-2xl font-bold"
        onClick={handleConfirm}
        disabled={isMining}
      >
        {isMining ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            Confirmando no balcão…
          </>
        ) : (
          "Confirmar Entrega do Chorinho"
        )}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={isMining}>
        Cancelar
      </button>
    </div>
  );
};

const Partner: NextPage = () => {
  const { address } = useAccount();
  const [scan, setScan] = useState<ScanState>({ kind: "idle" });
  const [manualCode, setManualCode] = useState("");

  const { data: isEstablishment, isLoading: roleLoading } = useScaffoldReadContract({
    contractName: "EstablishmentRegistry",
    functionName: "isEstablishment",
    args: [address],
  });

  const handleCode = (text: string) => {
    setScan({ kind: "result", payload: decodeCouponQr(text) });
    setManualCode("");
  };

  return (
    <div className="max-w-md w-full mx-auto px-5 py-8 flex flex-col gap-6 items-center">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold m-0 flex items-center justify-center gap-2 text-secondary">
          <QrCodeIcon className="h-8 w-8 text-primary" />
          Área do Lojista
        </h1>
        <p className="opacity-70 mt-2 mb-0">Validação de balcão rápida e acolhedora</p>
      </div>

      {!address ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="m-0 opacity-70">Entre com a conta do estabelecimento:</p>
          <RainbowKitCustomConnectButton />
        </div>
      ) : roleLoading || isEstablishment === undefined ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : !isEstablishment ? (
        <div className="rounded-box border border-base-300 bg-base-100 p-8 text-center flex flex-col gap-3">
          <p className="m-0 text-lg font-bold">Acesso restrito para estabelecimentos parceiros.</p>
          <p className="m-0 opacity-70">
            Tem uma loja, café, barbearia ou comércio físico e quer participar do Chorinho? Fale com a gente em{" "}
            <span className="font-semibold">parceiros@chorinho.app</span> para cadastrar sua empresa.
          </p>
        </div>
      ) : scan.kind === "result" && scan.payload ? (
        <ScanResult payload={scan.payload} onReset={() => setScan({ kind: "idle" })} />
      ) : scan.kind === "result" ? (
        <div className="flex flex-col gap-4 w-full items-center">
          <ResultFrame tone="error">
            <XCircleIcon className="h-20 w-20 text-error" />
            <p className="m-0 text-2xl font-extrabold text-error">Cupom inválido</p>
            <p className="m-0 opacity-70">Este QR code não é um passe ou cupom do Chorinho.</p>
          </ResultFrame>
          <button className="btn btn-primary btn-lg w-full" onClick={() => setScan({ kind: "idle" })}>
            <CameraIcon className="h-6 w-6" />
            Escanear de novo
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 w-full items-center">
          {scan.kind === "scanning" && !scan.cameraError ? (
            <>
              <QrScanner onScan={handleCode} onError={() => setScan({ kind: "scanning", cameraError: true })} />
              <p className="m-0 text-sm opacity-70 text-center">Aponte a câmera para o QR code na tela do cliente.</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setScan({ kind: "idle" })}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              {scan.kind === "scanning" && scan.cameraError && (
                <div className="alert alert-warning">
                  <span>Não foi possível abrir a câmera. Você pode digitar o código do cupom abaixo.</span>
                </div>
              )}
              <button
                className="btn btn-primary btn-lg w-full h-24 text-xl rounded-2xl font-bold shadow-xs"
                onClick={() => setScan({ kind: "scanning" })}
              >
                <CameraIcon className="h-8 w-8" />
                Escanear passe do cliente
              </button>
              <div className="divider text-xs opacity-60 my-0">ou</div>
              <form
                className="join w-full"
                onSubmit={e => {
                  e.preventDefault();
                  if (manualCode.trim()) handleCode(manualCode.trim());
                }}
              >
                <input
                  className="input input-bordered join-item w-full"
                  placeholder="Colar código do cupom"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                />
                <button type="submit" className="btn btn-neutral join-item" disabled={!manualCode.trim()}>
                  Conferir
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Partner;
