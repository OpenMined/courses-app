import React from 'react';
import {
  Box,
  Flex,
  Link,
  Stack,
  Avatar,
  Text,
  Heading,
  Image,
  useDisclosure,
  Divider,
} from '@chakra-ui/react';
import {
  useAuth,
  useFirestore,
  useUser,
  useFirestoreDocDataOnce,
} from 'reactfire';
import { Link as RRDLink } from 'react-router-dom';
import {
  faBars,
  faUserCircle,
  faCog,
  faCommentAlt,
  faHome,
  faLink,
  faSignOutAlt,
  faUserGraduate,
} from '@fortawesome/free-solid-svg-icons';
import { User } from '@openmined/shared/types';

import CourseDrawer from './Drawer';
import { getUserRef } from './_firebase';

import { COURSE_HEADER_ID, getLinkPropsFromLink, handleErrors } from '../../helpers';
import Icon from '../../components/Icon';
import useToast, { toastConfig } from '../../components/Toast';
import { Popover } from '../../components/Popover';
import logo from '../../assets/logo.svg';
import { discussionLink } from '../../content/links';

type LinkProps = {
  title: string;
  type: string;
  element?: React.ReactElement;
  auth?: boolean;
  unauth?: boolean;
  to?: string;
  onClick?: () => void;
};

const createLinks = (links: LinkProps[], onClick: () => void) =>
  links.map(({ type, title, auth, unauth, ...link }: LinkProps) => {
    if (type === 'element')
      return React.cloneElement(link.element, { key: title });

    const as: any = link.to ? { as: RRDLink } : {};

    if (!link.onClick) link.onClick = onClick;
    else {
      const currOnClick = link.onClick;

      link.onClick = () => {
        currOnClick();
        onClick();
      };
    }

    return (
      <Link
        {...as}
        key={title}
        {...link}
        color="gray.400"
        _hover={{ color: 'white' }}
        variant="flat"
      >
        {title}
      </Link>
    );
  });

const UserAvatar = () => {
  const user = useUser<firebase.User>();

  if (user) {
    return <Avatar src={user.photoURL || null} cursor="pointer" />;
  }

  return null;
};

export default ({
  icon,
  title,
  subtitle,
  course,
  lesson,
  sections,
  noShadow = false,
  noTitle = false,
}) => {
  const user: firebase.User = useUser();
  const auth = useAuth();
  const toast = useToast();

  const {
    isOpen: isLeftDrawerOpen,
    onOpen: onLeftDrawerOpen,
    onClose: onLeftDrawerClose,
  } = useDisclosure();

  const {
    isOpen: isRightDrawerOpen,
    onOpen: onRightDrawerOpen,
    onClose: onRightDrawerClose,
  } = useDisclosure();

  const BREAK = 'md';

  const menuLinks = [
    {
      title: 'Profile',
      link: `/users/${user.uid}`,
      icon: faUserCircle,
    },
    {
      title: 'Account Settings',
      link: '/users/settings',
      icon: faCog,
    },
    {
      title: 'Discussion Board',
      link: discussionLink,
      icon: faCommentAlt,
    },
    {
      type: 'divider',
    },
    {
      title: 'Logout',
      icon: faSignOutAlt,
      onClick: () =>
        auth
          .signOut()
          // Full reload on logout: clears reactfire's global query-observable cache
          // (keyed by path, never evicted) and the auth-ready prime, so a re-login is a
          // clean cold load instead of reusing a stale users/{uid}/courses observable
          // that crashes on same-user re-login.
          .then(() => {
            window.location.assign('/');
          })
          .catch((error) => handleErrors(toast, error)),
    },
  ];

  const RIGHT_LINKS: LinkProps[] = [
    {
      title: 'Dashboard',
      type: 'text',
      to: '/users/dashboard',
    },
    {
      title: 'User',
      type: 'element',
      element: (
        <Popover
          trigger={UserAvatar}
          position="bottom"
          alignment={{ base: 'start', [BREAK]: 'end' }}
          clickShouldCloseContent
        >
          <Stack spacing={3}>
            {menuLinks.map(
              ({ type, link = '', onClick, title, icon }, index) => {
                if (type === 'divider') return <Divider key={index} />;

                return (
                  <Flex
                    align="center"
                    cursor="pointer"
                    key={index}
                    {...getLinkPropsFromLink(link)}
                    onClick={() => {
                      if (onClick) onClick();
                    }}
                  >
                    {icon && (
                      <Icon icon={icon} boxSize={5} color="gray.400" mr={4} />
                    )}
                    <Text color="gray.700">{title}</Text>
                  </Flex>
                );
              }
            )}
          </Stack>
        </Popover>
      ),
    },
  ];

  const rightDrawerSections = [
    {
      title: 'Links',
      icon: faLink,
      fields: [
        {
          title: 'Dashboard',
          link: '/users/dashboard',
          icon: faUserGraduate,
        },
        ...menuLinks,
      ],
    },
  ];

  return (
    <Box
      position="sticky"
      width="100%"
      top={0}
      left={0}
      px={8}
      py={{ base: 6, [BREAK]: 4 }}
      bg="gray.900"
      boxShadow={noShadow ? null : 'md'}
      zIndex={2}
      id={COURSE_HEADER_ID}
    >
      <Flex as="nav" align="center" justify="space-between">
        <Box width={{ base: 6, [BREAK]: 1 / 4 }} boxSize={5}>
          <Icon
            icon={faBars}
            color="white"
            cursor="pointer"
            boxSize={5}
            onClick={isLeftDrawerOpen ? onLeftDrawerClose : onLeftDrawerOpen}
          />
        </Box>
        <Box width={{ base: 'full', [BREAK]: 1 / 2 }} mx={4}>
          {!noTitle && (
            <Flex justify="center" align="center">
              {icon && <Icon icon={icon} color="gray.700" boxSize={5} mr={4} />}
              <Heading
                as="span"
                size="md"
                color="white"
                flex={{ base: 1, [BREAK]: 'initial' }}
              >
                {title}
              </Heading>
            </Flex>
          )}
        </Box>
        <Stack
          width={1 / 4}
          justify="flex-end"
          align="center"
          direction="row"
          spacing={6}
          display={{ base: 'none', [BREAK]: 'flex' }}
        >
          {createLinks(RIGHT_LINKS, onRightDrawerClose)}
        </Stack>
        <Flex
          width={6}
          justify="flex-end"
          display={{ base: 'flex', [BREAK]: 'none' }}
          boxSize={5}
        >
          <Icon
            icon={faHome}
            color="white"
            cursor="pointer"
            boxSize={5}
            onClick={isRightDrawerOpen ? onRightDrawerClose : onRightDrawerOpen}
          />
        </Flex>
      </Flex>
      <CourseDrawer
        isOpen={isLeftDrawerOpen}
        onOpen={onLeftDrawerOpen}
        onClose={onLeftDrawerClose}
        header={
          <>
            <Link
              as={RRDLink}
              to={`/courses/${course}/${lesson}`}
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
            >
              <Text color="gray.400" mb={1}>
                {subtitle}
              </Text>
            </Link>
            <Heading as="span" size="lg" display="block" mb={3}>
              {title}
            </Heading>
            <Link
              as={RRDLink}
              to={`/courses/${course}`}
              color="cyan.200"
              _hover={{ color: 'cyan.400' }}
            >
              View Full Syllabus
            </Link>
          </>
        }
        content={sections}
      />
      {/*<CourseDrawer*/}
        {/*isOpen={isRightDrawerOpen}*/}
        {/*onOpen={onRightDrawerOpen}*/}
        {/*onClose={onRightDrawerClose}*/}
        {/*placement="right"*/}
        {/*header={*/}
          {/*<RRDLink to="/" onClick={onRightDrawerClose}>*/}
            {/*<Image*/}
              {/*src={logo}*/}
              {/*alt="OpenMined Courses"*/}
              {/*width={[160, null, 200]}*/}
              {/*style={{ filter: 'invert(1) brightness(2)' }}*/}
            {/*/>*/}
          {/*</RRDLink>*/}
        {/*}*/}
        {/*content={rightDrawerSections}*/}
      {/*/>*/}
    </Box>
  );
};
