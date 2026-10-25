import React from 'react';
import { StoryModal, StoryModalProps, Story } from './StoryModal';

export { StoryModal };
export type { StoryModalProps, Story };

export const StoryViewerModal: React.FC<StoryModalProps> = (props) => {
  return <StoryModal {...props} />;
};

export default StoryViewerModal;
