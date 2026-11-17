
document.addEventListener("DOMContentLoaded", function () {
    const turiField = document.getElementById("id_turi");

    if (!turiField) return;

    const inlineGroups = {
        test: document.getElementById("variantlar-group"),
        yozma: document.getElementById("yozma_vazifa-group"),
        programming: document.getElementById("programming-group"),
    };

    function updateForm() {
        const selectedType = turiField.value;

        Object.entries(inlineGroups).forEach(([type, element]) => {
            if (element) {
                element.style.display =
                    selectedType === type ? "" : "none";
            }
        });
    }

    turiField.addEventListener("change", updateForm);

    updateForm();
});