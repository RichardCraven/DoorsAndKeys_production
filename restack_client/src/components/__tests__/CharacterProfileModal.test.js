import React from "react";
import { render, fireEvent } from "@testing-library/react";
import CharacterProfileModal from "../CharacterProfileModal";
import { getReflectedDescription } from "../../utils/crew-manager";

describe("CharacterProfileModal: Name reflection in lore description", () => {
    const defaultSage = {
        id: 456,
        name: "Theodora",
        type: "sage",
        level: 1,
        isLeader: true,
        stats: { str: 3, int: 7, dex: 5, fort: 7, baseHp: 20 },
        description: "Loryastes is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe"
    };

    test("renders reflected name in lore text when character is Theodora", () => {
        render(<CharacterProfileModal crewMember={{ ...defaultSage }} onClose={jest.fn()} />);

        const loreEl = document.querySelector(".char-lore-text");
        expect(loreEl).not.toBeNull();
        expect(loreEl.textContent).toContain("Theodora is the headmaster of Citadel library");
        expect(loreEl.textContent).not.toContain("Loryastes");
    });

    test("renders reflected custom name when renamed via pencil button and saved", () => {
        const onUpdateCrewMember = jest.fn();
        const member = { ...defaultSage };
        render(<CharacterProfileModal crewMember={member} onClose={jest.fn()} onUpdateCrewMember={onUpdateCrewMember} />);

        // Click pencil icon
        const pencilBtn = document.querySelector(".char-rename-pencil-btn");
        expect(pencilBtn).not.toBeNull();
        fireEvent.click(pencilBtn);

        // Input new name
        const input = document.querySelector(".char-rename-input");
        expect(input).not.toBeNull();
        fireEvent.change(input, { target: { value: "Grandmaster Althea" } });

        // Click save button ✓
        const saveBtn = document.querySelector(".char-rename-save-btn");
        fireEvent.click(saveBtn);

        // Heading and lore should now reflect the custom name
        expect(document.querySelector(".char-name-text").textContent).toBe("Grandmaster Althea");
        const loreEl = document.querySelector(".char-lore-text");
        expect(loreEl.textContent).toContain("Grandmaster Althea is the headmaster of Citadel library");
        expect(onUpdateCrewMember).toHaveBeenCalledWith(expect.objectContaining({
            name: "Grandmaster Althea"
        }));
    });
});

describe("getReflectedDescription helper", () => {
    test("reflects alternate names for Sage, Soldier, and Monk", () => {
        const sageDesc = "Loryastes is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe";
        expect(getReflectedDescription(sageDesc, "Theodora", { type: "sage" }))
            .toBe("Theodora is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe");

        const soldierDesc = "Once the captain of the royal army's legendary vangard battalion, Sardonis has a reputation for fair leadership and honor.";
        expect(getReflectedDescription(soldierDesc, "Valeria", { type: "soldier" }))
            .toBe("Once the captain of the royal army's legendary vangard battalion, Valeria has a reputation for fair leadership and honor.");

        const monkDesc = "Yu was born into the dynastic order of the White Serpent, inheriting the secrets of absolute stillness and unyielding motion";
        expect(getReflectedDescription(monkDesc, "Mei", { type: "monk" }))
            .toBe("Mei was born into the dynastic order of the White Serpent, inheriting the secrets of absolute stillness and unyielding motion");
    });

    test("reflects custom names on characters with base descriptions", () => {
        const sageDesc = "Loryastes is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe";
        expect(getReflectedDescription(sageDesc, "MyCustomMage", { type: "sage" }))
            .toBe("MyCustomMage is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe");

        const barbDesc = "Ulaf is the son of the chieftan of the Rootsnarl Clan. He is on a journey to prove his mettle and one day take his father's place";
        expect(getReflectedDescription(barbDesc, "Ragnar", { type: "barbarian" }))
            .toBe("Ragnar is the son of the chieftan of the Rootsnarl Clan. He is on a journey to prove his mettle and one day take his father's place");
    });

    test("correctly handles switching back to base name from alternate name", () => {
        const altDesc = "Theodora is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe";
        expect(getReflectedDescription(altDesc, "Loryastes", { type: "sage" }))
            .toBe("Loryastes is the headmaster of Citadel library, chronicler of the histories of three monarchies, and a pupil of The Great Scribe");
    });
});
