import React, { useEffect, useState } from 'react';
import {
  Box,
  Image,
  Flex,
  Link,
  Button,
  Stack,
  Divider,
  Avatar,
  Text,
} from '@chakra-ui/react';
import {
  useAuth,
  useFirestore,
  useUser,
  useFirestoreDocDataOnce,
} from 'reactfire';
import { Link as RRDLink } from 'react-router-dom';
import useToast, { toastConfig } from './Toast';
import useScrollPosition from '@react-hook/window-scroll';
import {
  faTimes,
  faBars,
  faUserCircle,
  faCog,
  faCommentAlt,
} from '@fortawesome/free-solid-svg-icons';
import { User } from '@openmined/shared/types';

import { Popover } from './Popover';
import GridContainer from './GridContainer';
import Icon from './Icon';

import logo from '../assets/logo.svg';
import { handleErrors } from '../helpers';
import { discussionLink } from '../content/links';

interface LinkProps {
  title: string;
  type: string;
  element?: React.ReactElement;
  auth?: boolean;
  unauth?: boolean;
  to?: string;
  onClick?: () => void;
}

const createLinks = (
  links: LinkProps[],
  user: boolean,
  isScrolled: boolean,
  onClick: () => void
) => {
  const appropriateLinks = (l: LinkProps) =>
    (l.auth && user) || (l.unauth && !user) || (!l.auth && !l.unauth);

  const linkStyles = {
    variant: 'flat',
    color: isScrolled ? 'gray.400' : 'gray.600',
    _hover: {
      color: isScrolled ? 'white' : 'black',
    },
  };

  return links
    .filter(appropriateLinks)
    .map(({ type, title, auth, unauth, ...link }: LinkProps) => {
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

      if (type === 'text') {
        return (
          <Link {...as} key={title} {...link} {...linkStyles}>
            {title}
          </Link>
        );
      } else if (type === 'button') {
        return (
          <Button
            {...as}
            key={title}
            colorScheme={isScrolled ? 'white' : 'black'}
            variant="outline"
            {...link}
          >
            {title}
          </Button>
        );
      }

      return null;
    });
};

const UserAvatar = () => {
  const user = useUser<firebase.User>();

  if (user) {
    return <Avatar src={user.photoURL || null} cursor="pointer" />;
  }

  return null;
};

export default ({ noScrolling }) => {
  const user: firebase.User = useUser();
  const auth = useAuth();
  const toast = useToast();
  const isLoggedIn = !!user;

  const [show, setShow] = useState(false);

  const scrollY = useScrollPosition();
  const [isScrolled, setIsScrolled] = useState(noScrolling || false);

  useEffect(() => {
    if (!noScrolling) {
      if (scrollY > 0 && !isScrolled) setIsScrolled(true);
      else if (scrollY <= 0 && isScrolled) setIsScrolled(false);
    }
  }, [scrollY, isScrolled, noScrolling]);

  const BREAK = 'md';

  const LEFT_LINKS = [
    {
      title: 'Courses',
      type: 'text',
      to: '/courses',
    },
  ];

  const RIGHT_LINKS = [
    {
      title: 'Sign In',
      type: 'text',
      to: '/signin',
      unauth: true,
    },
    {
      title: 'Sign Up',
      type: 'button',
      to: '/signup',
      unauth: true,
    },
    {
      title: 'Dashboard',
      type: 'text',
      to: '/users/dashboard',
      auth: true,
    },
    {
      title: 'User',
      type: 'element',
      auth: true,
      element: (
        <Popover
          trigger={UserAvatar}
          position="bottom"
          alignment={{ base: 'start', [BREAK]: 'end' }}
          clickShouldCloseContent
        >
          <Stack spacing={3}>
            {user && (
              <Flex align="center" as={RRDLink} to={`/users/${user.uid}`}>
                <Icon icon={faUserCircle} boxSize={5} color="gray.400" mr={4} />
                <Text color="gray.700">Profile</Text>
              </Flex>
            )}
            <Flex align="center" as={RRDLink} to="/users/settings">
              <Icon icon={faCog} boxSize={5} color="gray.400" mr={4} />
              <Text color="gray.700">Account Settings</Text>
            </Flex>
            <Divider />
            <Flex
              align="center"
              as="a"
              href={discussionLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon icon={faCommentAlt} boxSize={5} color="gray.400" mr={4} />
              <Text color="gray.700">Discussion Board</Text>
            </Flex>
            <Divider />
            <Flex
              align="center"
              cursor="pointer"
              onClick={() =>
                auth
                  .signOut()
                  // Full reload on logout: clears reactfire's global query-observable
                  // cache (keyed by path, never evicted) and the auth-ready prime, so a
                  // re-login is a clean cold load instead of reusing a stale
                  // users/{uid}/courses observable that crashes on same-user re-login.
                  .then(() => {
                    window.location.assign('/');
                  })
                  .catch((error) => handleErrors(toast, error))
              }
            >
              <Text color="gray.700">Logout</Text>
            </Flex>
          </Stack>
        </Popover>
      ),
    },
  ];

  const iconStyles = {
    color: isScrolled ? 'white' : 'black',
    transitionProperty: 'color',
    transitionDuration: 'normal',
    transitionTimingFunction: 'ease-in-out',
    boxSize: 5,
  };

  return (
    <Box
      position="fixed"
      width="100%"
      top={0}
      left={0}
      py={{ base: 6, [BREAK]: 4 }}
      transitionProperty="background"
      transitionDuration="normal"
      transitionTimingFunction="ease-in-out"
      bg={isScrolled ? 'gray.900' : 'white'}
      boxShadow={{ base: 'md', [BREAK]: 'none' }}
      zIndex={1}
    >
      <GridContainer>
        <Flex as="nav" align="center" justify="space-between" wrap="wrap">
          <RRDLink to="/" onClick={() => setShow(false)}>
            <Image
              src={logo}
              alt="OpenMined Courses"
              width={[160, null, 200]}
              mr={6}
              transitionProperty="filter"
              transitionDuration="normal"
              transitionTimingFunction="normal"
              style={{
                filter: isScrolled ? 'invert(1) brightness(2)' : 'none',
              }}
            />
          </RRDLink>
          <Box
            display={['block', null, 'none']}
            boxSize={5}
            onClick={() => setShow(!show)}
          >
            {show ? (
              <Icon icon={faTimes} {...iconStyles} />
            ) : (
              <Icon icon={faBars} {...iconStyles} />
            )}
          </Box>
          <Box
            display={{ base: show ? 'flex' : 'none', [BREAK]: 'flex' }}
            width={{ base: 'full', [BREAK]: 'auto' }}
            flexGrow={1}
            my={{ base: 4, [BREAK]: 0 }}
          >
            <Divider
              orientation="vertical"
              height={6}
              mr={{ base: 4, [BREAK]: 6 }}
              display={{ base: 'none', [BREAK]: 'block' }}
            />
            <Stack
              align={{ [BREAK]: 'center' }}
              direction={{ base: 'column', [BREAK]: 'row' }}
              spacing={{ base: 4, [BREAK]: 6 }}
            >
              {createLinks(LEFT_LINKS, isLoggedIn, isScrolled, () =>
                setShow(false)
              )}
            </Stack>
          </Box>
          <Box
            display={{ base: show ? 'block' : 'none', [BREAK]: 'block' }}
            flexGrow={{ base: 1, [BREAK]: 0 }}
          >
            <Stack
              align={{ [BREAK]: 'center' }}
              direction={{ base: 'column', [BREAK]: 'row' }}
              spacing={{ base: 4, [BREAK]: 6 }}
            >
              {createLinks(RIGHT_LINKS, isLoggedIn, isScrolled, () =>
                setShow(false)
              )}
            </Stack>
          </Box>
        </Flex>
      </GridContainer>
    </Box>
  );
};
