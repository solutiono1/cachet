/* What it means when independent chain readers agree, or do not.
 *
 * A proof is checked against the chain, but nobody reads the chain directly;
 * they read it through an endpoint somebody runs. Trusting one endpoint makes
 * that operator part of the proof, and a dishonest one could answer with an
 * envelope that was never paid. So Cachet asks several operators and believes
 * a record only when enough of them say the same thing.
 *
 * This module holds no network code, only the reading of a report, so that
 * verification stays testable without a network.
 */

/** Was the read good enough to believe? */
export function agreed(agreement) {
	if (!agreement) return true;
	return agreement.enough === true && agreement.conflicting.length === 0;
}

/** Plain English for a report, or null when nothing is wrong. */
export function agreementProblem(agreement) {
	if (!agreement) return null;

	if (agreement.conflicting.length) {
		return (
			`The endpoints disagree about what the chain says. ` +
			`${agreement.agreed} of ${agreement.asked} gave one answer and ` +
			`${agreement.conflicting.length} gave another, so nothing read here can be ` +
			`trusted. Check the envelope id on a block explorer.`
		);
	}

	if (!agreement.enough) {
		return (
			`Only ${agreement.answered} of ${agreement.asked} independent endpoints could ` +
			`be reached, and ${agreement.quorum} must agree before a payment is confirmed. ` +
			`This is not a failed proof; it is a read that could not be completed.`
		);
	}

	return null;
}

/** A short line for the verifier to show when the read was good. */
export function agreementNote(agreement) {
	if (!agreement) return null;
	if (!agreed(agreement)) return null;
	const n = agreement.agreed;
	if (n < 2) return `Read through ${n} chain endpoint.`;
	return `Confirmed by ${n} independent chain endpoints.`;
}
