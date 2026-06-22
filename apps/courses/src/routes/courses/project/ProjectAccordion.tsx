import React from 'react';
import { Button, Flex, Text, Link, Image, Box } from '@chakra-ui/react';

import { PROJECT_PART_SUBMISSIONS } from '../_helpers';
import StatusAccordion from '../../../components/StatusAccordion';
import SubmissionInline from '../../../components/SubmissionInline';
import { useNavigate } from 'react-router-dom';
import { discussionLink, mentorshipLink } from '../../../content/links';

// This is a component that shows up when the user has made a failed attempt ("failed-but-pending")
// ... has failed all attempts ("failed")
// ... or has passed the part ("passed")
const AttemptedView = ({
  image,
  title,
  description,
  submissions,
  part,
  course,
  ...props
}) => {
  return <Box {...props}>
    <Flex direction="column" align="center" textAlign="center" mb={6}>
      <Image src={image} boxSize={12} mb={4} />
      <Text fontWeight="bold" mb={2}>
        {title}
      </Text>
      <Text color="gray.700" fontSize="sm">
        {/* description is string or element */}
        {description}
      </Text>
    </Flex>
    {submissions.map((submission, index) => (
      <SubmissionInline
        key={index}
        link={`/courses/${course}/project/${part}/${index + 1}`}
        {...submission}
      />
    ))}
  </Box>
};

export default ({ content, course, onBeginProjectPart, ...props }) => {
  // TODO: https://github.com/OpenMined/courses-app/issues/53
  // const navigate = useNavigate();

  // The text to show when the user is pending a submission review
  const pendingReviewText = (
    <>
      Thank you for your submission! Our mentors will review your work and give
      you feedback within 1-2 days. You will receive a notification and an email
      when your project has been reviewed. In the meantime, see what others did
      by discussing this project on our{' '}
      <Link
        as="a"
        href={discussionLink}
        target="_blank"
        rel="noopener noreferrer"
      >
        Discussion Board
      </Link>
      .
    </>
  );

  // The text of the main CTA button, depending on the status of the part
  const getButtonText = (status) => {
    if (status === 'not-started') return 'Begin';
    else if (status === 'in-progress') return 'Continue Working';
    else if (status === 'submitted') return 'Review Submission';
    else if (status === 'failed-but-pending') return 'Try Again';
  };

  const projectContent = content.map((i) => {
    const { _key, description, status, submissions } = i;

    const panel = () => (
      <>
        {status !== 'passed' && status !== 'failed' && (
          <>
            {status !== 'failed-but-pending' && (
              <Text color="gray.700" mb={6}>
                {status === 'not-started' || status === 'in-progress'
                  ? typeof description === 'string'
                    ? description
                    : description()
                  : pendingReviewText}
              </Text>
            )}
            {status === 'failed-but-pending' && (
              <AttemptedView
                image="https://emojis.slackmojis.com/emojis/images/1531847584/4234/blob-eyeroll.gif?1531847584"
                title="Sorry, let's try again!"
                description="You did not pass this part of the project. You can check out the link below for your feedback and try again after making some corrections."
                submissions={submissions}
                course={course}
                part={_key}
                mb={6}
              />
            )}
            <Flex align="center">
              <Button
                onClick={() => {
                  if (status === 'not-started') {
                    onBeginProjectPart(_key).then(() => {
                      // TODO: https://github.com/OpenMined/courses-app/issues/53
                      // navigate(`/courses/${course}/project/${_key}`);
                      window.location.href = `/courses/${course}/project/${_key}`;
                    });
                  } else if (status === 'submitted') {
                    const attempt = submissions.findIndex(
                      ({ status }) => status === 'pending'
                    );

                    // TODO: https://github.com/OpenMined/courses-app/issues/53
                    // navigate(
                    //   `/courses/${course}/project/${_key}/${attempt + 1}`
                    // );
                    window.location.href = `/courses/${course}/project/${_key}/${
                      attempt + 1
                    }`;
                  } else {
                    // TODO: https://github.com/OpenMined/courses-app/issues/53
                    // navigate(`/courses/${course}/project/${_key}`);
                    window.location.href = `/courses/${course}/project/${_key}`;
                  }
                }}
                colorScheme="black"
                mr={4}
              >
                {getButtonText(status)}
              </Button>
              <Text color="gray.700" fontSize="sm">
                {submissions.filter(({ status }) => status !== 'none').length}{' '}
                of {PROJECT_PART_SUBMISSIONS} attempts
              </Text>
            </Flex>
          </>
        )}
        {status === 'failed' && (
          <AttemptedView
            image="https://emojis.slackmojis.com/emojis/images/1578406259/7444/sadblob.gif?1578406259"
            title="You're out of attempts!"
            description={
              <>
                We're sorry to inform you that you have run out of attempts on
                this part of the project. But don't worry, there are other ways
                to take your learning to the next level. Try applying for our{' '}
                <Link
                  as="a"
                  href={mentorshipLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="magenta.500"
                  _hover={{ color: 'magenta.700' }}
                >
                  mentorship program
                </Link>{' '}
                to get more hands-on training.
              </>
            }
            submissions={submissions}
            course={course}
            part={_key}
          />
        )}
        {status === 'passed' && (
          <AttemptedView
            image="https://emojis.slackmojis.com/emojis/images/1572027739/6832/blob_cheer.png?1572027739"
            title="Congratulations!"
            description="You passed this portion of the project. Check out the link below for your feedback."
            submissions={submissions}
            course={course}
            part={_key}
          />
        )}
      </>
    );

    return { ...i, panel };
  });

  return <StatusAccordion content={projectContent} {...props} />;
};
