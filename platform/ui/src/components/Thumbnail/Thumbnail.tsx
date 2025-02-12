import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

const Thumbnail = ({
                     displaySetInstanceUID,
                     className,
                     imageSrc,
                     imageAltText,
                     isActive,
                     onClick,
                     onDoubleClick,
                   }) => {
  return (
    <div
      className={classnames(
        className,
        'cursor-pointer select-none w-full'
      )}
      id={`thumbnail-${displaySetInstanceUID}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="button"
      tabIndex="0"
    >
      <div
        className={classnames(
          'flex h-20 items-center justify-center overflow-hidden bg-black', // Reduced height from h-32 to h-20
          isActive
            ? 'border-primary-light border-2'
            : 'border-secondary-light border hover:border-blue-300'
        )}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAltText}
            className="w-full h-full object-cover" // Changed from object-contain to object-cover
            crossOrigin="anonymous"
          />
        ) : (
          <div className="text-white">{imageAltText}</div>
        )}
      </div>
    </div>
  );
};

Thumbnail.propTypes = {
  displaySetInstanceUID: PropTypes.string.isRequired,
  className: PropTypes.string,
  imageSrc: PropTypes.string,
  imageAltText: PropTypes.string,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
};

export default Thumbnail;