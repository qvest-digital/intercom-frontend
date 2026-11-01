import styled from "@emotion/styled";
import { FC, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserSettingsIcon } from "../../assets/icons/icon";
import { useStorage } from "../accessing-local-storage/access-local-storage";
import { isMobile } from "../../bowser";
import { HEADER_ACTIONS_ID } from "../header";

const UserSettingsWrapper = styled.div`
  padding: 1rem 2rem 1rem 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 2rem;
  font-weight: bold;

  &:hover {
    cursor: pointer;
  }

  svg {
    width: 2.5rem;
    flex-shrink: 0;
    fill: rgba(89, 203, 232, 1);
  }

  &.mobile {
    width: 50vw;
    justify-content: end;
    font-size: 1.5rem;
  }
`;

const Username = styled.div`
  margin-right: 0.5rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

interface UserSettingsButtonProps {
  onClick?: () => void;
}

export const UserSettingsButton: FC<UserSettingsButtonProps> = (props) => {
  const { onClick } = props;
  const { readFromStorage } = useStorage();
  const username = readFromStorage("username") || "Guest";

  // The header renders before the page, so its slot exists once this mounts.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setSlot(document.getElementById(HEADER_ACTIONS_ID));
  }, []);

  const button = (
    <UserSettingsWrapper className={isMobile ? "mobile" : ""} onClick={onClick}>
      <Username>{username}</Username>
      <UserSettingsIcon />
    </UserSettingsWrapper>
  );

  return slot ? createPortal(button, slot) : button;
};
