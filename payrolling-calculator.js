// Gebruik de "no-conflict" veilige wrapper.
jQuery(document).ready(function($) {
    // BINNEN deze functie kun je het '$' teken weer veilig gebruiken.

    console.log("Payrolling Calculator ready...");

    // --- Payrolling Calculator Script ---
    try {
        const $employeesSlider = $('#employees-compact');
        const $costInput = $('#current-cost-compact');
        const $employeesValueDisplay = $('#employees-value-compact');
        const $totalSavingsElement = $('#total-savings-compact');
        const $costBreakdownElement = $('#cost-breakdown-compact');

        function calculateSavings() {
            if (!$employeesSlider.length || !$costInput.length) return;

            const costValue = ($costInput.val() || "0").replace(',', '.');
            const employees = parseInt($employeesSlider.val(), 10) || 0;
            const currentCostPerMonth = parseFloat(costValue);
            const newCostPerMonth = 2650; // Via ons netwerk vanaf €2.650
            const monthsPerYear = 12;

            if (isNaN(employees) || isNaN(currentCostPerMonth)) {
                if ($totalSavingsElement.length) $totalSavingsElement.text('€ 0');
                if ($costBreakdownElement.length) $costBreakdownElement.text('Ongeldige invoer.');
                return;
            }

            // Bereken besparing per jaar
            const monthlySavingsPerEmployee = currentCostPerMonth - newCostPerMonth;
            const annualSavings = monthlySavingsPerEmployee * employees * monthsPerYear;

            if (annualSavings > 0) {
                const formattingOptions = { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 };
                const formattedSavings = new Intl.NumberFormat('nl-NL', formattingOptions).format(annualSavings);
                if ($totalSavingsElement.length) $totalSavingsElement.text(formattedSavings);
                if ($costBreakdownElement.length) {
                    $costBreakdownElement.text(`Besparing op jaarbasis`);
                }
            } else if (annualSavings === 0) {
                if ($totalSavingsElement.length) $totalSavingsElement.text('€ 0');
                if ($costBreakdownElement.length) {
                    $costBreakdownElement.text('Geen besparing bij deze kosten.');
                }
            } else {
                if ($totalSavingsElement.length) $totalSavingsElement.text('€ 0');
                if ($costBreakdownElement.length) {
                    $costBreakdownElement.text('Je huidige kosten lijken lager dan gemiddeld, weet je zeker dat dit klopt?');
                }
            }
        }

        if ($employeesSlider.length && $costInput.length) {
            $employeesSlider.on('input', function() {
                if ($employeesValueDisplay.length) $employeesValueDisplay.text($(this).val());
                calculateSavings();
            });
            $costInput.on('input', calculateSavings);
            calculateSavings();
            console.log("Payrolling calculator initialized.");
        }
    } catch (e) {
        console.error("Error in Payrolling Calculator script:", e);
    }
    // --- Einde Payrolling Calculator Script ---

}); // EINDE jQuery(document).ready()
